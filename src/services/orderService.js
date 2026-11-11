const {
  Order,
  OrderLog,
  Product,
  Table,
  Coupon,
  User
} = require('../models');
const AppError = require('../utils/appError');
const generateOrderCode = require('../utils/generateOrderCode');
const { calcOrderTotal } = require('../utils/calcTotal');
const OrderSocket = require('../sockets/orderSocket');
const {
  ORDER_STATUS,
  ITEM_STATUS,
  TABLE_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  LOG_ACTIONS,
  ALLOWED_STATUS_FLOW
} = require('../constants/orderStatus');
const ROLES = require('../constants/roles');

class OrderService {
  /**
   * Khách đặt đơn mới gắn với bàn
   */
  static async createOrder({
    tableNumber,
    customerName,
    customerPhone,
    note,
    couponCode,
    items,
    user = null
  }) {
    // 1. Kiểm tra bàn
    const table = await Table.findOne({ tableNumber, isActive: true });
    if (!table) {
      throw new AppError(`Bàn '${tableNumber}' không tồn tại hoặc đã ngưng phục vụ`, 404);
    }

    if (!items || items.length === 0) {
      throw new AppError('Đơn hàng phải có ít nhất 1 món', 400);
    }

    // 2. Tra cứu và kiểm tra từng sản phẩm từ CSDL để snapshot giá chuẩn xác
    const productIds = items.map((i) => i.product);
    const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map();
    dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

    const processedItems = [];
    for (const item of items) {
      const prod = productMap.get(item.product.toString());
      if (!prod) {
        throw new AppError(`Món ăn ID '${item.product}' không tồn tại hoặc đã ngừng kinh doanh`, 400);
      }
      if (!prod.isAvailable) {
        throw new AppError(`Món '${prod.name}' hiện đang tạm hết hàng`, 400);
      }

      // Xử lý tùy chọn (options)
      const selectedOptions = [];
      if (Array.isArray(item.selectedOptions)) {
        for (const opt of item.selectedOptions) {
          // Tìm trong options của product để lấy giá chuẩn
          const dbOpt = prod.options.find((o) => o.name === opt.optionName);
          let extraPrice = 0;
          if (dbOpt) {
            const dbChoice = dbOpt.choices.find((c) => c.label === opt.choiceLabel);
            if (dbChoice) extraPrice = dbChoice.extraPrice;
          }
          selectedOptions.push({
            optionName: opt.optionName,
            choiceLabel: opt.choiceLabel,
            extraPrice
          });
        }
      }

      processedItems.push({
        product: prod._id,
        nameSnapshot: prod.name,
        priceSnapshot: prod.price,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        selectedOptions,
        note: item.note || '',
        itemStatus: ITEM_STATUS.PENDING,
        addedBy: user ? user._id : null,
        addedRound: 1
      });
    }

    // 3. Xử lý Coupon nếu có
    let appliedCoupon = null;
    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    }

    // 4. Tính toán tổng tiền
    const { subtotal, discount, totalAmount } = calcOrderTotal(processedItems, appliedCoupon);

    // 5. Sinh mã đơn hàng và tạo Order
    let orderCode = generateOrderCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const exists = await Order.exists({ orderCode });
      if (!exists) isCodeUnique = true;
      else orderCode = generateOrderCode();
    }

    const order = await Order.create({
      orderCode,
      table: table._id,
      customer: user ? user._id : null,
      customerName: customerName || (user ? user.fullName : `Khách ${tableNumber}`),
      customerPhone: customerPhone || (user ? user.phone : ''),
      items: processedItems,
      note: note || '',
      status: ORDER_STATUS.PENDING,
      subtotal,
      discount,
      totalAmount,
      coupon: appliedCoupon ? appliedCoupon._id : null,
      isLocked: false
    });

    // Cập nhật trạng thái bàn sang occupied
    table.status = TABLE_STATUS.OCCUPIED;
    await table.save();

    // 6. Ghi nhật ký đơn hàng (OrderLog)
    await OrderLog.create({
      order: order._id,
      actor: user ? user._id : null,
      actorRole: user ? user.role : ROLES.CUSTOMER,
      action: LOG_ACTIONS.CREATE,
      before: null,
      after: {
        orderCode: order.orderCode,
        table: table.tableNumber,
        itemsCount: processedItems.length,
        totalAmount
      },
      note: 'Khách đặt đơn hàng mới tại bàn'
    });

    // 7. Bắn socket thông báo cho nhân viên và admin
    const populatedOrder = await Order.findById(order._id).populate('table', 'tableNumber');
    OrderSocket.notifyNewOrder(populatedOrder);

    return populatedOrder;
  }

  /**
   * Khách thêm món (gọi thêm đợt mới) cho đơn đang phục vụ
   */
  static async addMoreItems(orderId, items, user = null) {
    const order = await Order.findById(orderId).populate('coupon');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED].includes(order.status)) {
      throw new AppError('Không thể gọi thêm món cho đơn hàng đã kết thúc hoặc đã hủy', 400);
    }

    const productIds = items.map((i) => i.product);
    const dbProducts = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map();
    dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

    // Tìm round cao nhất
    const maxRound = order.items.reduce((max, it) => Math.max(max, it.addedRound || 1), 1);
    const nextRound = maxRound + 1;

    const newItems = [];
    for (const item of items) {
      const prod = productMap.get(item.product.toString());
      if (!prod || !prod.isAvailable) {
        throw new AppError(`Món '${prod ? prod.name : item.product}' hiện không khả dụng`, 400);
      }

      const selectedOptions = [];
      if (Array.isArray(item.selectedOptions)) {
        for (const opt of item.selectedOptions) {
          const dbOpt = prod.options.find((o) => o.name === opt.optionName);
          let extraPrice = 0;
          if (dbOpt) {
            const dbChoice = dbOpt.choices.find((c) => c.label === opt.choiceLabel);
            if (dbChoice) extraPrice = dbChoice.extraPrice;
          }
          selectedOptions.push({
            optionName: opt.optionName,
            choiceLabel: opt.choiceLabel,
            extraPrice
          });
        }
      }

      const newItem = {
        product: prod._id,
        nameSnapshot: prod.name,
        priceSnapshot: prod.price,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        selectedOptions,
        note: item.note || '',
        itemStatus: ITEM_STATUS.PENDING,
        addedBy: user ? user._id : null,
        addedRound: nextRound
      };

      order.items.push(newItem);
      newItems.push(newItem);
    }

    // Tính lại tổng tiền
    const { subtotal, discount, totalAmount } = calcOrderTotal(order.items, order.coupon);
    order.subtotal = subtotal;
    order.discount = discount;
    order.totalAmount = totalAmount;

    await order.save();

    // Ghi log
    await OrderLog.create({
      order: order._id,
      actor: user ? user._id : null,
      actorRole: user ? user.role : ROLES.CUSTOMER,
      action: LOG_ACTIONS.ADD_ITEM,
      before: null,
      after: { addedRound: nextRound, itemsAdded: newItems.length, newTotal: totalAmount },
      note: `Gọi thêm ${newItems.length} món (Đợt ${nextRound})`
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber')
      .populate('items.product', 'name images category');

    // Bắn realtime cho nhân viên và khách
    OrderSocket.notifyOrderUpdated(populatedOrder);
    OrderSocket.notifyNewOrder(populatedOrder);

    return populatedOrder;
  }

  /**
   * Khách cập nhật số lượng / tùy chọn hoặc xóa món (chỉ khi pending và chưa lock)
   */
  static async customerUpdateItem(orderId, itemId, { quantity, note }, user = null) {
    const order = await Order.findById(orderId).populate('coupon');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status !== ORDER_STATUS.PENDING || order.isLocked) {
      throw new AppError('Đơn hàng đã được nhân viên tiếp nhận, không thể tự sửa. Vui lòng liên hệ nhân viên!', 403);
    }

    const item = order.items.id(itemId);
    if (!item) {
      throw new AppError('Không tìm thấy món ăn trong đơn hàng', 404);
    }

    const beforeState = { quantity: item.quantity, note: item.note };
    if (quantity !== undefined) {
      item.quantity = Math.max(1, parseInt(quantity, 10));
    }
    if (note !== undefined) {
      item.note = note;
    }

    const { subtotal, discount, totalAmount } = calcOrderTotal(order.items, order.coupon);
    order.subtotal = subtotal;
    order.discount = discount;
    order.totalAmount = totalAmount;

    await order.save();

    await OrderLog.create({
      order: order._id,
      actor: user ? user._id : null,
      actorRole: user ? user.role : ROLES.CUSTOMER,
      action: LOG_ACTIONS.UPDATE_ITEM,
      before: beforeState,
      after: { quantity: item.quantity, note: item.note },
      note: `Khách chỉnh sửa món '${item.nameSnapshot}'`
    });

    OrderSocket.notifyOrderUpdated(order);
    return order;
  }

  /**
   * Khách xóa món trong đơn (chỉ khi pending)
   */
  static async customerRemoveItem(orderId, itemId, user = null) {
    const order = await Order.findById(orderId).populate('coupon');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status !== ORDER_STATUS.PENDING || order.isLocked) {
      throw new AppError('Đơn hàng đã được nhân viên tiếp nhận, không thể tự xóa món. Vui lòng liên hệ nhân viên!', 403);
    }

    const item = order.items.id(itemId);
    if (!item) {
      throw new AppError('Không tìm thấy món ăn trong đơn hàng', 404);
    }

    const remainingItems = order.items.filter((it) => it._id.toString() !== itemId.toString());
    if (remainingItems.length === 0) {
      throw new AppError('Không thể xóa hết món. Nếu không muốn đặt, bạn có thể chọn HỦY ĐƠN HÀNG.', 400);
    }

    const removedName = item.nameSnapshot;
    order.items.pull(itemId);

    const { subtotal, discount, totalAmount } = calcOrderTotal(order.items, order.coupon);
    order.subtotal = subtotal;
    order.discount = discount;
    order.totalAmount = totalAmount;

    await order.save();

    await OrderLog.create({
      order: order._id,
      actor: user ? user._id : null,
      actorRole: user ? user.role : ROLES.CUSTOMER,
      action: LOG_ACTIONS.REMOVE_ITEM,
      before: { itemName: removedName },
      after: null,
      note: `Khách xóa món '${removedName}' khỏi đơn`
    });

    OrderSocket.notifyOrderUpdated(order);
    return order;
  }

  /**
   * Khách hoặc Nhân viên hủy đơn hàng
   */
  static async cancelOrder(orderId, reason = 'Khách yêu cầu hủy', actorUser = null) {
    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    const actorRole = actorUser ? actorUser.role : ROLES.CUSTOMER;

    // Khách chỉ hủy được khi pending và chưa bị khóa (chưa đến bước xác nhận)
    if (actorRole === ROLES.CUSTOMER) {
      if (order.status !== ORDER_STATUS.PENDING || order.isLocked) {
        throw new AppError('Đơn hàng đã được xác nhận hoặc đang chế biến, không thể hủy.', 400);
      }
    } else {
      // Nhân viên chỉ hủy được khi pending hoặc confirmed
      if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status) && actorRole !== ROLES.ADMIN) {
        throw new AppError('Không thể hủy đơn hàng ', 400);
      }
    }

    const prevStatus = order.status;
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelReason = reason;
    await order.save();

    // Kiểm tra xem bàn còn đơn nào active không để đổi trạng thái bàn
    const activeOrdersAtTable = await Order.countDocuments({
      table: order.table._id,
      status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] }
    });
    if (activeOrdersAtTable === 0) {
      await Table.findByIdAndUpdate(order.table._id, { status: TABLE_STATUS.EMPTY });
    }

    await OrderLog.create({
      order: order._id,
      actor: actorUser ? actorUser._id : null,
      actorRole,
      action: LOG_ACTIONS.CANCEL,
      before: { status: prevStatus },
      after: { status: ORDER_STATUS.CANCELLED, cancelReason: reason },
      note: `Hủy đơn hàng: ${reason}`
    });

    OrderSocket.notifyStatusChanged(order, reason);
    return order;
  }

  /**
   * Nhân viên xác nhận đơn hàng
   */
  static async confirmOrder(orderId, staffUser) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new AppError(`Không thể xác nhận đơn hàng đang ở trạng thái '${order.status}'`, 400);
    }

    order.status = ORDER_STATUS.CONFIRMED;
    order.confirmedBy = staffUser._id;
    order.confirmedAt = new Date();
    order.isLocked = true; // Khóa chỉnh sửa của khách

    // Cập nhật tất cả items sang preparing
    order.items.forEach((it) => {
      if (it.itemStatus === ITEM_STATUS.PENDING) {
        it.itemStatus = ITEM_STATUS.PREPARING;
      }
    });

    await order.save();

    await OrderLog.create({
      order: order._id,
      actor: staffUser._id,
      actorRole: staffUser.role,
      action: LOG_ACTIONS.CONFIRM,
      before: { status: ORDER_STATUS.PENDING },
      after: { status: ORDER_STATUS.CONFIRMED, confirmedBy: staffUser.fullName },
      note: 'Nhân viên đã xác nhận đơn hàng'
    });

    OrderSocket.notifyStatusChanged(order);
    return order;
  }

  /**
   * Nhân viên từ chối đơn hàng (kèm lý do)
   */
  static async rejectOrder(orderId, reason, staffUser) {
    if (!reason || reason.trim() === '') {
      throw new AppError('Vui lòng nhập lý do từ chối đơn hàng', 400);
    }

    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new AppError('Chỉ có thể từ chối đơn hàng đang chờ xác nhận', 400);
    }

    order.status = ORDER_STATUS.REJECTED;
    order.rejectReason = reason;
    await order.save();

    // Trả lại trạng thái bàn nếu không còn đơn khác
    const activeOrdersAtTable = await Order.countDocuments({
      table: order.table._id,
      status: { $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] }
    });
    if (activeOrdersAtTable === 0) {
      await Table.findByIdAndUpdate(order.table._id, { status: TABLE_STATUS.EMPTY });
    }

    await OrderLog.create({
      order: order._id,
      actor: staffUser._id,
      actorRole: staffUser.role,
      action: LOG_ACTIONS.REJECT,
      before: { status: ORDER_STATUS.PENDING },
      after: { status: ORDER_STATUS.REJECTED, rejectReason: reason },
      note: `Từ chối đơn: ${reason}`
    });

    OrderSocket.notifyStatusChanged(order, reason);
    return order;
  }

  /**
   * Nhân viên / Admin chuyển trạng thái đơn hàng theo luồng chuẩn
   */
  static async updateOrderStatus(orderId, newStatus, staffUser, reason = '') {
    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    const currentStatus = order.status;
    if (currentStatus === newStatus) {
      return order;
    }

    // Kiểm tra quy tắc chuyển trạng thái hợp lệ
    const allowedNext = ALLOWED_STATUS_FLOW[currentStatus] || [];
    const isAdmin = staffUser.role === ROLES.ADMIN;

    if (!allowedNext.includes(newStatus) && !isAdmin) {
      throw new AppError(`Không thể chuyển trạng thái từ '${currentStatus}' sang '${newStatus}'`, 400);
    }

    order.status = newStatus;

    if (newStatus === ORDER_STATUS.SERVED) {
      // Đánh dấu tất cả items là done
      order.items.forEach((it) => {
        if (it.itemStatus !== ITEM_STATUS.CANCELLED) {
          it.itemStatus = ITEM_STATUS.DONE;
        }
      });
    }

    if (newStatus === ORDER_STATUS.COMPLETED) {
      // Hoàn tất đơn hàng: giải phóng bàn
      await Table.findByIdAndUpdate(order.table._id, { status: TABLE_STATUS.EMPTY });
    }

    await order.save();

    await OrderLog.create({
      order: order._id,
      actor: staffUser._id,
      actorRole: staffUser.role,
      action: LOG_ACTIONS.CHANGE_STATUS,
      before: { status: currentStatus },
      after: { status: newStatus },
      note: reason || `Đổi trạng thái từ ${currentStatus} -> ${newStatus}`
    });

    OrderSocket.notifyStatusChanged(order, reason);
    return order;
  }

  /**
   * Nhân viên thêm/sửa/xóa món trong đơn của khách (ghi log order_logs)
   */
  static async staffModifyItems(orderId, { action, itemId, itemData }, staffUser) {
    const order = await Order.findById(orderId).populate('coupon');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED].includes(order.status)) {
      throw new AppError('Không thể sửa món cho đơn hàng đã kết thúc', 400);
    }

    let logAction = LOG_ACTIONS.UPDATE_ITEM;
    let beforeData = null;
    let afterData = null;
    let note = '';

    if (action === 'add') {
      const prod = await Product.findById(itemData.product);
      if (!prod) throw new AppError('Món ăn không tồn tại', 404);

      const newItem = {
        product: prod._id,
        nameSnapshot: prod.name,
        priceSnapshot: prod.price,
        quantity: Math.max(1, parseInt(itemData.quantity, 10) || 1),
        selectedOptions: itemData.selectedOptions || [],
        note: itemData.note || '',
        itemStatus: ITEM_STATUS.PREPARING,
        addedBy: staffUser._id,
        addedRound: 99 // Đợt thêm bởi nhân viên
      };
      order.items.push(newItem);
      logAction = LOG_ACTIONS.ADD_ITEM;
      afterData = { item: prod.name, quantity: newItem.quantity };
      note = `Nhân viên thêm món '${prod.name}'`;
    } else if (action === 'update') {
      const it = order.items.id(itemId);
      if (!it) throw new AppError('Không tìm thấy món ăn trong đơn', 404);

      beforeData = { quantity: it.quantity, note: it.note };
      if (itemData.quantity) it.quantity = Math.max(1, parseInt(itemData.quantity, 10));
      if (itemData.note !== undefined) it.note = itemData.note;
      if (itemData.itemStatus) it.itemStatus = itemData.itemStatus;

      afterData = { quantity: it.quantity, note: it.note, itemStatus: it.itemStatus };
      note = `Nhân viên cập nhật món '${it.nameSnapshot}'`;
    } else if (action === 'remove') {
      const it = order.items.id(itemId);
      if (!it) throw new AppError('Không tìm thấy món ăn trong đơn', 404);

      beforeData = { name: it.nameSnapshot, quantity: it.quantity };
      order.items.pull(itemId);
      logAction = LOG_ACTIONS.REMOVE_ITEM;
      note = `Nhân viên xóa món '${beforeData.name}'`;
    }

    // Tính lại tiền
    const { subtotal, discount, totalAmount } = calcOrderTotal(order.items, order.coupon);
    order.subtotal = subtotal;
    order.discount = discount;
    order.totalAmount = totalAmount;

    await order.save();

    await OrderLog.create({
      order: order._id,
      actor: staffUser._id,
      actorRole: staffUser.role,
      action: logAction,
      before: beforeData,
      after: afterData,
      note
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber')
      .populate('items.product', 'name images');

    OrderSocket.notifyOrderUpdated(populatedOrder);
    return populatedOrder;
  }

  /**
   * Thanh toán đơn hàng
   */
  static async payOrder(orderId, { paymentMethod = PAYMENT_METHODS.CASH, couponCode = null }, staffUser) {
    const order = await Order.findById(orderId).populate('table');
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new AppError('Đơn hàng này đã được thanh toán trước đó', 400);
    }

    if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED].includes(order.status)) {
      throw new AppError('Không thể thanh toán đơn hàng đã hủy hoặc bị từ chối', 400);
    }

    // Áp dụng hoặc tính lại coupon nếu có
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) {
        order.coupon = coupon._id;
      }
    } else if (order.coupon) {
      coupon = await Coupon.findById(order.coupon);
    }

    const { subtotal, discount, totalAmount } = calcOrderTotal(order.items, coupon);
    order.subtotal = subtotal;
    order.discount = discount;
    order.totalAmount = totalAmount;

    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.paymentMethod = paymentMethod;
    order.paidAt = new Date();
    order.paidBy = staffUser ? staffUser._id : null;
    order.status = ORDER_STATUS.COMPLETED;

    // Cập nhật trạng thái từng item
    order.items.forEach((it) => {
      if (it.itemStatus !== ITEM_STATUS.CANCELLED) {
        it.itemStatus = ITEM_STATUS.DONE;
      }
    });

    await order.save();

    // 1. Tăng soldCount cho các món ăn
    for (const it of order.items) {
      if (it.itemStatus === ITEM_STATUS.DONE) {
        await Product.findByIdAndUpdate(it.product, {
          $inc: { soldCount: it.quantity }
        });
      }
    }

    // 2. Tăng usedCount cho coupon nếu có
    if (coupon) {
      await Coupon.findByIdAndUpdate(coupon._id, {
        $inc: { usedCount: 1 }
      });
    }

    // 3. Giải phóng bàn
    await Table.findByIdAndUpdate(order.table._id, { status: TABLE_STATUS.EMPTY });

    // 4. Ghi log thanh toán
    await OrderLog.create({
      order: order._id,
      actor: staffUser._id,
      actorRole: staffUser.role,
      action: LOG_ACTIONS.PAY,
      before: { paymentStatus: PAYMENT_STATUS.UNPAID },
      after: {
        paymentStatus: PAYMENT_STATUS.PAID,
        paymentMethod,
        totalAmount,
        paidAt: order.paidAt
      },
      note: `Thanh toán thành công ${totalAmount.toLocaleString('vi-VN')}đ qua ${paymentMethod}`
    });

    OrderSocket.notifyStatusChanged(order);
    return order;
  }

  /**
   * Danh sách đơn hàng kèm bộ lọc cho Staff / Admin
   */
  static async getOrders({
    status = null,
    tableId = null,
    paymentStatus = null,
    date = null,
    startDate = null,
    endDate = null,
    search = '',
    page = 1,
    limit = 20
  }) {
    const filter = {};
    if (status) filter.status = status;
    if (tableId) filter.table = tableId;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim() !== '') {
      filter.$or = [
        { orderCode: { $regex: search.trim(), $options: 'i' } },
        { customerName: { $regex: search.trim(), $options: 'i' } },
        { customerPhone: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const currentPage = Math.max(1, parseInt(page, 10));
    const itemsPerPage = Math.max(1, parseInt(limit, 10));
    const skip = (currentPage - 1) * itemsPerPage;

    const [orders, totalItems] = await Promise.all([
      Order.find(filter)
        .populate('table', 'tableNumber')
        .populate('customer', 'fullName email phone')
        .populate('confirmedBy', 'fullName')
        .populate('coupon', 'code type value')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      orders,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    };
  }

  /**
   * Lấy chi tiết đơn hàng kèm logs
   */
  static async getOrderById(orderId) {
    const order = await Order.findById(orderId)
      .populate('table', 'tableNumber capacity status')
      .populate('customer', 'fullName email phone')
      .populate('confirmedBy', 'fullName')
      .populate('coupon', 'code type value minOrder maxDiscount')
      .populate('items.product', 'name images price category');

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    const logs = await OrderLog.find({ order: orderId })
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .lean();

    return {
      order,
      logs
    };
  }

  /**
   * Lấy đơn hàng theo mã đơn (cho khách kiểm tra)
   */
  static async getOrderByCode(orderCode) {
    const order = await Order.findOne({ orderCode })
      .populate('table', 'tableNumber')
      .populate('coupon', 'code type value')
      .populate('items.product', 'name images price');

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }
    return order;
  }

  /**
   * Nhân viên duyệt toàn bộ món đang pending của các đợt gọi thêm
   */
  static async approvePendingItems(orderId, staffUser) {
    const order = await Order.findById(orderId).populate('table');
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

    let count = 0;
    order.items.forEach((it) => {
      if (it.itemStatus === ITEM_STATUS.PENDING) {
        it.itemStatus = ITEM_STATUS.DONE;
        count++;
      }
    });

    if (count > 0) {
      await order.save();
      await OrderLog.create({
        order: order._id,
        actor: staffUser._id,
        actorRole: staffUser.role,
        action: LOG_ACTIONS.CONFIRM,
        before: null,
        after: { approvedCount: count },
        note: `Nhân viên đã duyệt ${count} món gọi thêm sang phục vụ`
      });

      const populatedOrder = await Order.findById(order._id)
        .populate('table', 'tableNumber')
        .populate('items.product', 'name images');
      OrderSocket.notifyOrderUpdated(populatedOrder);
      return populatedOrder;
    }
    return order;
  }

  /**
   * Nhân viên duyệt 1 món cụ thể đang pending
   */
  static async approveSingleItem(orderId, itemId, staffUser) {
    const order = await Order.findById(orderId).populate('table');
    if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);

    const it = order.items.id(itemId);
    if (!it) throw new AppError('Không tìm thấy món ăn trong đơn', 404);

    it.itemStatus = ITEM_STATUS.DONE;
    await order.save();

    await OrderLog.create({
      order: order._id,
      actor: staffUser._id,
      actorRole: staffUser.role,
      action: LOG_ACTIONS.CONFIRM,
      before: null,
      after: { item: it.nameSnapshot },
      note: `Nhân viên duyệt món '${it.nameSnapshot}' (Đợt ${it.addedRound || 1})`
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('table', 'tableNumber')
      .populate('items.product', 'name images');
    OrderSocket.notifyOrderUpdated(populatedOrder);
    return populatedOrder;
  }
}

module.exports = OrderService;
