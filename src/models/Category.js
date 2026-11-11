const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên danh mục là bắt buộc'],
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['drink', 'food', 'other'],
      default: 'drink'
    },
    image: {
      type: String,
      default: '/images/default-category.png'
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true, locale: 'vi' });
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
