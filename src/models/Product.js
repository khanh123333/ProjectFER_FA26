const mongoose = require('mongoose');
const slugify = require('slugify');

const optionChoiceSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    extraPrice: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const productOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    isMultiple: {
      type: Boolean,
      default: false
    },
    choices: [optionChoiceSchema]
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên món là bắt buộc'],
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Danh mục món là bắt buộc']
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Giá món là bắt buộc'],
      min: [0, 'Giá không thể nhỏ hơn 0']
    },
    images: {
      type: [String],
      default: ['/images/default-food.png']
    },
    options: [productOptionSchema],
    isAvailable: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    soldCount: {
      type: Number,
      default: 0
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ name: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });

productSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true, locale: 'vi' }) + '-' + Date.now().toString().slice(-4);
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
