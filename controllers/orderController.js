const { Order, OrderItem, Cart, Product, sequelize } = require('../models');

const orderController = {
  // Create order from cart (no in-app card payment; Amazon storefront is separate)
  async createOrder(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const { shippingAddress } = req.body;

      const cartItems = await Cart.findAll({
        where: { userId },
        include: [{
          model: Product,
          as: 'product'
        }],
        transaction
      });

      if (cartItems.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Cart is empty' });
      }

      let totalAmount = 0;
      const orderItems = [];

      for (const cartItem of cartItems) {
        const product = cartItem.product;
        if (product.quantity < cartItem.quantity) {
          await transaction.rollback();
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }

        totalAmount += parseFloat(product.priceSell) * cartItem.quantity;
        orderItems.push({
          productId: product.id,
          quantity: cartItem.quantity,
          price: product.priceSell
        });
      }

      const order = await Order.create({
        userId,
        totalAmount,
        shippingAddress,
        paymentIntentId: null,
        status: 'pending',
      }, { transaction });

      for (const item of orderItems) {
        await OrderItem.create({
          orderId: order.id,
          ...item
        }, { transaction });

        const product = await Product.findByPk(item.productId, { transaction });
        product.quantity -= item.quantity;
        await product.save({ transaction });
      }

      await Cart.destroy({
        where: { userId },
        transaction
      });

      await transaction.commit();

      res.json({ order });
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  },

  async getOrders(req, res) {
    try {
      const userId = req.user.id;
      const orders = await Order.findAll({
        where: { userId },
        include: [{
          model: OrderItem,
          as: 'orderItems',
          include: [{
            model: Product,
            as: 'product'
          }]
        }],
        order: [['createdAt', 'DESC']]
      });
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },

  async getOrder(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await Order.findOne({
        where: { id, userId },
        include: [{
          model: OrderItem,
          as: 'orderItems',
          include: [{
            model: Product,
            as: 'product'
          }]
        }]
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }
};

module.exports = orderController;
