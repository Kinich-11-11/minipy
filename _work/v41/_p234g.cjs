const fs=require('fs');
const L=[["tz","print('a')\nprint('%.1e' % 0)\nprint('b')"],["td","print('a')\nprint('%.1e' % 1e-320)\nprint('b')"],["tn","print('a')\nprint('%.1e' % 1e-300)\nprint('b')"]];
fs.writeFileSync('_work/v41/_p234g.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
