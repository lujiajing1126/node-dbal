var _ = require('underscore');
var call = Function.prototype.call;
var unCurryingThis = function(f) {
    return function() {
        return call.apply(f,arguments);
    }
};

var array_slice = unCurryingThis(Array.prototype.slice);
var object_toString = unCurryingThis(Object.prototype.toString);
var type_of = function(object,type){
    return object_toString(object).toLowerCase() === ('[Object ' + type + ']').toLowerCase();
};
var obj_compare = function (obj1,obj2) {
    var has_conflict = false;
    _.each(obj1,function(val,key){
        if(obj2.hasOwnProperty(key) && obj2[key] != val) {
            has_conflict = true;
        }
    });
    return has_conflict;
};
module.exports.unCurryingThis = unCurryingThis;
module.exports.array_slice = array_slice;
module.exports.object_toString = object_toString;
module.exports.type_of = type_of;
module.exports.obj_compare = obj_compare;