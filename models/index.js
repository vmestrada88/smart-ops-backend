
const sequelize = require('./db');
const { Model } = require('sequelize');
const Client = require('./Client');
const Contact = require('./Contact');
const Job = require('./Job');
const Product = require('./Product');
const AmazonAffiliateListing = require('./AmazonAffiliateListing');
const User = require('./User');
const { Invoice, InvoiceItem } = require('./Invoice');
const Cart = require('./Cart');
const { Order, OrderItem } = require('./Order');

const isSequelizeModel = (candidate) => candidate && candidate.prototype instanceof Model;

if (isSequelizeModel(Client) && isSequelizeModel(Contact)) {
  Client.hasMany(Contact, { foreignKey: 'clientId', as: 'contacts', onDelete: 'CASCADE' });
  Contact.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
}

if (isSequelizeModel(Client) && isSequelizeModel(Job)) {
  Client.hasMany(Job, { foreignKey: 'clientId', as: 'jobs', onDelete: 'CASCADE' });
  Job.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
}

if (isSequelizeModel(User) && isSequelizeModel(Cart)) {
  User.hasMany(Cart, { foreignKey: 'userId', as: 'cartItems', onDelete: 'CASCADE' });
  Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

if (isSequelizeModel(Product) && isSequelizeModel(Cart)) {
  Product.hasMany(Cart, { foreignKey: 'productId', as: 'cartItems', onDelete: 'CASCADE' });
  Cart.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
}

if (isSequelizeModel(User) && isSequelizeModel(Order)) {
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'CASCADE' });
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}

if (isSequelizeModel(Order) && isSequelizeModel(OrderItem)) {
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems', onDelete: 'CASCADE' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
}

if (isSequelizeModel(Product) && isSequelizeModel(OrderItem)) {
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
}

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
