const { DataTypes, Model } = require('sequelize');
const sequelize = require('./db');
const bcrypt = require('bcrypt');

class User extends Model {
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Never serialize the password hash, even when an instance was loaded with it
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

User.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('client', 'technician', 'manager', 'admin'),
    allowNull: false,
  },
  // Optional display color for UI elements (hex string)
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'User',
  timestamps: false,
  // Password hash is excluded by default; use User.scope('withPassword') when it is needed (login, password change)
  defaultScope: {
    attributes: { exclude: ['password'] },
  },
  scopes: {
    withPassword: {},
  },
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

module.exports = User;
