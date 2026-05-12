const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('DeviceToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.TEXT, allowNull: false },
    platform: {
      type: DataTypes.ENUM('web', 'ios', 'android'),
      defaultValue: 'web',
    },
  }, {
    tableName: 'device_tokens',
    timestamps: true,
    // A device token is globally unique (the same physical device shouldn't
    // be registered to two users), but per-user we also avoid duplicates.
    indexes: [{ unique: true, fields: ['token'] }],
  });
};
