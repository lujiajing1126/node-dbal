## Node-DBAL

> This is a database abstaction layer for mysql query usage using in the UAircraft Project

## Install

```bash
npm install node-dbal
```

```javascript
var SQLBuilder = require('node-dbal');
var builder = new SQLBuilder();
sql = builder.select().from('t_bill_order').toSQL();
// 'SELECT * FROM `t_bill_order`
```

## LICENSE

MIT

