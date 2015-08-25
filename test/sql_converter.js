var expect = require('chai').expect;
var SQLBuilder = require('../index');
var util = require('util');

describe('SQL Builder Tests',function(){
    var builder = new SQLBuilder();
    beforeEach(function(){
        builder.reset();
    });
    context('correct usages',function(){
        it('simple selct test',function(){
            var sql = builder.select().from('t_bill_order').toSQL();
            expect(sql.toLowerCase()).to.equal('SELECT * FROM `t_bill_order`'.toLowerCase());
        });
        it('simple where clause with number',function(){
            var sql = builder.select().from('t_bill_order').where('account_id = %s').setParameter(1).toSQL();
            expect(sql.toLowerCase()).to.equal('SELECT * FROM `t_bill_order` WHERE account_id = 1'.toLowerCase());
        });
        it('where clause with string',function(){
            var sql = builder.select().from('t_bill_order').where('account_id = %s').setParameter('1').toSQL();
            expect(sql.toLowerCase()).to.equal("SELECT * FROM `t_bill_order` WHERE account_id = '1'".toLowerCase());
        });
        it('limit number test',function() {
            var sql = builder.select().from('t_bill_order').where('account_id = %d').setParameter(1).limit(5).toSQL();
            expect(sql.toLowerCase()).to.equal("SELECT * FROM `t_bill_order` WHERE account_id = 1 LIMIT 5".toLowerCase());
        });
        it('group by test',function() {
            var timestamp = +new Date();
            var sql = builder.select().from('t_bill_order').where('date = %d').setParameter(timestamp).groupBy('account_id').limit(5).toSQL();
            expect(sql.toLowerCase()).to.equal(util.format("SELECT * FROM `t_bill_order` WHERE date = %d GROUP BY `account_id` LIMIT 5",timestamp).toLowerCase());
        });
        it('alias table_name test',function(){
            var sql = builder.select('u.account_id','u.date').from('t_bill_order','u').where('date = %s').setParameter(132222414).toSQL();
            expect(sql.toLowerCase()).to.equal("SELECT `u`.`account_id`,`u`.`date` FROM `t_bill_order` AS `u` WHERE date = 132222414".toLowerCase());
        });
        it('order by test', function () {
            var sql = builder.select().from('t_bill_order').orderBy('account_id','ASC').toSQL();
            expect(sql.toLowerCase()).to.equal("SELECT * FROM `t_bill_order` ORDER BY `account_id` ASC".toLowerCase());
        });
        it('multi order by test', function () {
            var sql = builder.select().from('t_bill_order').orderBy('account_id','ASC').addOrderBy('date').toSQL();
            expect(sql.toLowerCase()).to.equal("SELECT * FROM `t_bill_order` ORDER BY `account_id` ASC,`date`".toLowerCase());
        });
        it('multi group by test', function () {
            var timestamp = +new Date();
            var sql = builder.select().from('t_bill_order').where('date = %d').setParameter(timestamp).groupBy('account_id').addGroupBy('date_type').limit(5).toSQL();
            expect(sql.toLowerCase()).to.equal(util.format("SELECT * FROM `t_bill_order` WHERE date = %d GROUP BY `account_id`,`date_type` LIMIT 5",timestamp).toLowerCase());
        });
        it('multi where clause with and test',function() {
            var sql = builder.select().from('t_bill_order').where('account_id = %s').andWhere('date_type = %s').setParameter(1,'day').toSQL();
            expect(sql.toLowerCase()).to.equal("SELECT * FROM `t_bill_order` WHERE account_id = 1 AND date_type = 'day'".toLowerCase());
        });
    });
    context('join tests',function() {
        it('simple left join test',function(){
            var sql = builder.select('a.*','b.*').from('atom_v1c_day','a').leftJoin('a','t_member','b','a.account_id=b.top_organization_id').where("date = %d").setParameter(1433088000).toSQL();
            expect(sql.toLowerCase()).to.equal("select `a`.*,`b`.* from `atom_v1c_day` AS `a` left join `t_member` `b` on a.account_id=b.top_organization_id where date = 1433088000".toLowerCase());
        });
        it('sub-query join test', function () {
            var sub_query = builder.select('manager','top_organization_id').from('t_member').groupBy('top_organization_id');
            expect(sub_query.toSQL().toLowerCase()).to.equal("select `manager`,`top_organization_id` from `t_member` group by `top_organization_id`".toLowerCase());
            var query = (new SQLBuilder).select('a.*','b.*').from('atom_v1c_day','a').leftJoin('a',sub_query,'b','a.account_id=b.top_organization_id').where("date = %d").setParameter(1433088000).toSQL();
            expect(query.toLowerCase()).to.equal("SELECT `a`.*,`b`.* FROM `atom_v1c_day` AS `a` LEFT JOIN (SELECT `manager`,`top_organization_id` FROM `t_member` GROUP BY `top_organization_id`) `b` ON a.account_id=b.top_organization_id where date = 1433088000".toLowerCase());
        });
    });
    context('incorrect usages',function(){
        it('should throw undefined error',function(){
            var err_msg = null;
            try {
                builder.from('t_bill_order').toSQL();
            } catch(ex) {
                err_msg = ex.message;
            }
            expect(err_msg).not.to.be.null;
            expect(err_msg).to.equal('Undefined Action!');
        });
    });
});
