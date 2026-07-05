
const sequelize = require('./db');
const Client = require('./Client');
const Contact = require('./Contact');
const Job = require('./Job');
const Product = require('./Product');
const AmazonAffiliateListing = require('./AmazonAffiliateListing');
const User = require('./User');
const { Invoice, InvoiceItem } = require('./Invoice');
const Cart = require('./Cart');
const { Order, OrderItem } = require('./Order');

Client.hasMany(Contact, { foreignKey: 'clientId', as: 'contacts', onDelete: 'CASCADE' });
Contact.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

Client.hasMany(Job, { foreignKey: 'clientId', as: 'jobs', onDelete: 'CASCADE' });
Job.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

User.hasMany(Cart, { foreignKey: 'userId', as: 'cartItems', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Product.hasMany(Cart, { foreignKey: 'productId', as: 'cartItems', onDelete: 'CASCADE' });
Cart.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = {
  sequelize,
  Client,
  Contact,
  Job,
  Product,
  AmazonAffiliateListing,
  User,
  Invoice,
  InvoiceItem,
  Cart,
  Order,
  OrderItem,
};
