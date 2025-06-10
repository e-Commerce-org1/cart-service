export default () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  database: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://yashikasingh:Yashi%402003@cluster0.r0gt3.mongodb.net/eCommerce',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  auth: {
    serviceUrl: process.env.AUTH_SERVICE_URL || '172.50.3.60:5051',
  },
}); 