const { DataTypes } = require('sequelize');
const sequelize = require('./db');

/**
 * Curated Amazon Associates picks (public shop). Not tied to internal inventory (Product).
 */
const AmazonAffiliateListing = sequelize.define(
  'AmazonAffiliateListing',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amazonAffiliateUrl: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    imageUrls: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false,
    tableName: 'AmazonAffiliateListings',
  }
);

module.exports = AmazonAffiliateListing;
