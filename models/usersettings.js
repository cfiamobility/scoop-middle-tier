/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usersettings', {
    userid: {
      type: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'userid'
      }
    },
    push_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    tableName: 'usersettings'
  });
};
