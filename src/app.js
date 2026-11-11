const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');

const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const { apiLimiter } = require('./middlewares/rateLimiter');

const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Để tương thích với CDNs Bootstrap, FontAwesome, SweetAlert2, Socket.IO
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body & Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting cho API
app.use('/api', apiLimiter);

// Cấu hình View Engine EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// Nạp Routes
app.use(routes);

// Xử lý 404 & Lỗi tập trung
app.use(notFound);
app.use(errorHandler);

module.exports = app;
