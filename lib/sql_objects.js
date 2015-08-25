var util = require('util');
var _ = require('lodash');
var assert = require('assert');

var IFObject = function (table,condition,trueObj,falseObj) {
    this.table = table;
    this.condition = condition;
    this.true_obj = trueObj;
    this.false_obj = falseObj;
    this.isDISTINCT = false;
};

IFObject.prototype.getTable = function() {
    return this.table;
};

IFObject.prototype.toSQL = function() {
  return util.format("if(%s,%s,%s)",toString(this.condition),toString(this.true_obj),toString(this.false_obj));
};

IFObject.prototype.serialize = function() {
    return (this.table == null || this.table == undefined ?  "" : this.table + ".") + util.format("if(%s,%s,%s)",this.condition instanceof  IFObject?this.condition.serialize():this.condition,this.true_obj instanceof  IFObject?this.true_obj.serialize():this.true_obj,this.false_obj instanceof  IFObject?this.false_obj.serialize():this.false_obj);
};

/**
 * We use specified lexical struct for the editable params
 * The struct consist of several items
 * name -- which is the label for the param
 * type -- type of the param, which is like `smali` on `Dalvik`
 * I -> Int,F -> Float,S -> String,[ -> Array, Z -> Bool,T -> TimeStamp
 * table_column -- link to the column in table
 * search_key -- optional -- the column searched according to query passed by user
 * @example
 * {{showName|I client.id|company_name}}
 * @param str
 * @constructor
 */
var QueryParam = function(str) {
    assert.equal(typeof str,'string');
    var array = str.match(/{{(.*)}}/);
    assert.equal(array.length,2);
    this.param_str = array[1];
    this.name = null;
    this.variable = null;
    this._type = null;
    this.resouce = null;
    this.showname = null;
    this.tableName = null;
    this.columnName = null;
    this._parse();
};

QueryParam.prototype._parse = function() {
    var tmp = this.param_str.split('|');
    this.name = tmp[0];
    this.variable = tmp[1];
    this.showname = tmp[2];
    this._type = this.variable.split(' ')[0];
    this.resouce = this.variable.split(' ')[1];
    this.tableName = this.resouce.split('.')[0];
    this.columnName = this.resouce.split('.')[1];
};

QueryParam.prototype.getValue = function(val) {
    var array = false;
    if(_.startsWith(this._type,DataTypes.Array)) {
        array = true;
    }
    var result = null;
    switch(this._type) {
        case 'I':
            if(_.isArray(val)) {
                result = _.map(val,function(record){
                   return parseInt(record);
                });
                break;
            }
            result = parseInt(val);
            break;
        default:
            if(_.isArray(val)) {
                result = _.map(val,function(record){
                    return record;
                });
                break;
            }
            result = val;
    }
    if(array) {
        if(_.isArray(result)) {
            if(this._type.indexOf(DataTypes.String) != -1) {
                result = util.format("('%s')", result.join("','"));
            } else {
                result = util.format("(%s)", result.join(','));
            }
        }
    } else {
        if(this._type.indexOf(DataTypes.String) != -1) {
            result = util.format("'%s'", result);
        } else {
            result = util.format("%s", result);
        }
    }
    return result;
};

var toString = function(obj) {
    if(obj instanceof IFObject)
        return obj.toSQL();
    if(typeof obj === 'string')
        return obj;
};

var DataTypes = {
    TimeStamp: "T",
    Integer: "I",
    String: "S",
    Float: "F",
    Bool: "Z",
    Void: "V",
    Array: "[",
    Enum: 'E'
};
module.exports.IFObject = IFObject;
module.exports.QueryParam = QueryParam;
module.exports.DataTypes = DataTypes;

if(require.main == module) {
    console.log(new IFObject('t_bill_order','t_bill_transaction.transaction_type = 3','- t_bill_transaction.amount','t_bill_transaction.amount').serialize());
}