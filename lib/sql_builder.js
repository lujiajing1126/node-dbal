var util = require('util');
var utils = require('./utils');
var _ = require('underscore');
var crypto = require('crypto');

function SQLBuilder() {
    this.reset();
}

var JOIN_MODE = {
    LEFT: 'left',
    RIGHT: 'right',
    INNER: 'inner'
};

var slashParam = function(str) {
    if(utils.type_of(str,'Array')) {
        return _.map(str,slashParam);
    } else {
        // handle IFObject
        if(/^if/i.test(str)) {
            return str;
        }
        // handle Computed property
        if(/^([a-zA-Z]+)\((distinct )?(.*)\)$/i.test(str)) {
            var matches = str.match(/^([a-zA-Z]+)\((distinct )?(.*)\)/i);
            return matches[1] + wrap(matches[2] ? "distinct " + slashParam(matches[3]) : slashParam(matches[3]),'(');
        // handle a.* conditions
        } else if(/\.\*$/.test(str)) {
            return wrap(str.split('.')[0],'`') + ".*";
        // handle pure '*' condition
        } else if(str == '*') {
            return str;
        // handle column as
        } else if(/ as /i.test(str)) {
            return str;
        }
        // handle not .* but * as a operator condition
        if(/[\+\-\/\*]/.test(str)) {
            return str;
        }
        return wrap(str.replace(/\./, '`.`'), '`');
    }
};

SQLBuilder.prototype.reset = function () {
    this.table_name = null;
    this.select_columns = [];
    this.insert_columns = "";
    this.insert_value = "";
    this.in_join_mode = false;
    this.action = null;
    this.pattern = "";
    this.condition = null;
    this.limit_condition = null;
    this.groupby_condition = null;
    this.orderby_condition = null;
    this.alias_names = {};
    this.join_parts = {};
}

SQLBuilder.prototype.from = function(table_name,alias) {
    this.table_name = table_name;
    if(alias) {
        this._addAlias(table_name,alias);
        if(this.action === 'SELECT') {
            this.pattern += wrap('AS') + util.format('`%s`',alias);
        }
    }
    return this;
}

SQLBuilder.prototype._addAlias = function(table_name,alias) {
    if(this.alias_names.hasOwnProperty(alias) && this.alias_names[alias] != table_name)
        throw new Error('Not Unique Alias!');
    this.alias_names[alias] = table_name;
}

SQLBuilder.prototype.getAllAlias = function() {
    return this.alias_names;
}

/**
 * get table name by alias name
 * @param table_name
 * @returns {boolean|*}
 */
SQLBuilder.prototype.getTableNameByAlias = function(table_name) {
    return _.invert(this.alias_names).hasOwnProperty(table_name) && this.alias_names[table_name];
}

SQLBuilder.prototype.select = function () {
    this.action = 'SELECT';
    this.pattern = "SELECT %s FROM `%s`";
    var args = utils.array_slice(arguments);
    if(args.length == 0) {
        this.select_columns = '*';
    } else {
        this.select_columns = args;
    }
    return this;
}

SQLBuilder.prototype.insert = function (table_name,columns,values) {
    this.action = 'INSERT';
    this.pattern = "INSERT INTO %s (%s) VALUES (%s)";
    this.table_name = table_name;
    this.insert_columns = columns;
    this.insert_value = values;
    return this;
}

SQLBuilder.prototype.setParameter = function() {
    if(this.action === null) {
        throw new Error('Unknown condition!');
    } else if(this.action != null && arguments.length == 0) {
        throw new Error('Invalid arguments!');
    }
    var args = [this.condition];
    var params = _.map(utils.array_slice(arguments),function(val) {
        if(typeof val === 'string') {
            if(/\b(AND|OR)\b/i.test(val))
                return val;
            else
                return wrap(val,"\'");
        }
        return val;
    });
    var tmp = util.format.apply(null,args.concat(params));
    this.condition = tmp;
    return this;
}



SQLBuilder.prototype.__join = function(fromAlias,join,alias,condition,type) {
    this.in_join_mode = true;
    if(typeof join === 'string') {
        if(!this.join_parts.hasOwnProperty(fromAlias))
            this.join_parts[fromAlias] = [];
        this._addAlias(join,alias);
        this.join_parts[fromAlias].push({joinType:type,joinTable:join,joinAlias: alias,joinCondition: condition,tableType:'tableName'});
    } else if(join instanceof SQLBuilder) {
        var shasum = crypto.createHash('sha1');
        shasum.update(join.toSQL().replace(/\s/g,''));
        fromAlias = shasum.digest('hex');
        if(!this.join_parts.hasOwnProperty(fromAlias))
            this.join_parts[fromAlias] = [];
        this._addAlias(shasum,alias);
        if(utils.obj_compare(this.alias_names,join.getAllAlias()))
            throw new Error('Not Unique Alias!');
        else
            _.extend(this.alias_names,join.getAllAlias());
        this.join_parts[fromAlias].push({joinType:type,joinTable:join.toSQL(),joinAlias: alias,joinCondition: condition,tableType: 'subQuery'});
    } else {
        throw new Error('Unknown type of join table!');
    }
}

SQLBuilder.prototype.leftJoin = function (fromAlias,join,alias,condition) {
    this.__join(fromAlias,join,alias,condition,JOIN_MODE.LEFT);
    return this;
}

SQLBuilder.prototype.rightJoin = function (fromAlias,join,alias,condition) {
    this.__join(fromAlias,join,alias,condition,JOIN_MODE.RIGHT);
    return this;
}

SQLBuilder.prototype.innerJoin = function (fromAlias,join,alias,condition) {
    this.__join(fromAlias,join,alias,condition,JOIN_MODE.INNER);
    return this;
}

SQLBuilder.prototype.where = function(condition) {
    this.condition = condition;
    return this;
}

SQLBuilder.prototype.andWhere = function (condition) {
    this.condition += wrap('AND') + condition;
    return this;
}

SQLBuilder.prototype.orWhere = function (condition) {
    this.condition += wrap('OR') + condition;
    return this;
}

SQLBuilder.prototype.limit = function(number) {
    this.limit_condition = +number;
    return this;
}

SQLBuilder.prototype.groupBy = function(column) {
    if(this.groupby_condition === null)
        this.groupby_condition = [];
    this.groupby_condition.push(column);
    return this;
}

SQLBuilder.prototype.addGroupBy = function(column) {
    if(this.groupby_condition === null)
        throw new Error('Group by condition not defined!');
    this.groupby_condition.push(column);
    return this;
}

SQLBuilder.prototype.orderBy = function(column,sort) {
    if(this.orderby_condition === null)
        this.orderby_condition = [];
    sort === undefined ? this.orderby_condition.push(slashParam(column)) : this.orderby_condition.push(slashParam(column) + " " + sort);
    return this;
}

SQLBuilder.prototype.addOrderBy = function(column,sort) {
    if(this.orderby_condition === null)
        throw new Error('Order by condition not defined!');
    sort === undefined ? this.orderby_condition.push(slashParam(column)) : this.orderby_condition.push(slashParam(column) + " " + sort);
    return this;
}

SQLBuilder.prototype._buildJoinPart = function() {
    var sql = '';
    _.each(this.join_parts,function(val){
        _.each(val, function (ele) {
            sql += wrap(ele['joinType'].toUpperCase() + wrap('JOIN') + ( ele['tableType'] === 'subQuery' ? wrap(ele['joinTable'],'(') : slashParam(ele['joinTable']))) + slashParam(ele['joinAlias']) + wrap('ON') + ele['joinCondition'];
        })
    });
    return sql;
}

/**
 * get the final SQL str
 * @returns {String} result
 */
SQLBuilder.prototype.toSQL = function() {
    if(this.action === null) {
        throw new Error('Undefined Action!');
    }
    if(this.action == 'INSERT'){
        var tmp = util.format(this.pattern,this.table_name,slashParam(this.insert_columns),this.insert_value);
    }else{
        var tmp = util.format(this.pattern,utils.type_of(this.select_columns,'Array') ? slashParam(this.select_columns).join(',') :slashParam(this.select_columns),this.table_name);
    }

    if(this.in_join_mode)
        tmp += this._buildJoinPart();
    if(this.condition)
        tmp += wrap("WHERE") + this.condition;
    if(this.groupby_condition)
        tmp += wrap("GROUP BY") + slashParam(this.groupby_condition);
    if(_.isArray(this.orderby_condition))
        tmp += wrap("ORDER BY") + this.orderby_condition.join(',');
    if(this.limit_condition) {
        tmp += wrap("LIMIT") + this.limit_condition;
    }
    return tmp;
}

function wrap(word,wrapper) {
    if(!wrapper)
        return " " + word + " ";
    var TOKENS = {
        "[":"]",
        "{":"}",
        "(":")",
        "<":">"
    };
    return wrapper + word + (TOKENS.hasOwnProperty(wrapper) ? TOKENS[wrapper]: wrapper);
}

module.exports = SQLBuilder;
