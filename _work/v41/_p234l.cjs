const fs=require('fs');
const L=[["q1","print('a')\nprint('%.2f' % 0)\nprint('b')"],["q2","print('a')\nprint(f'{0:.2f}')\nprint('b')"],["q3","print('a')\nprint(format(0, '.2e'))\nprint('b')"],["q4","print('a')\nprint(f'{0:e}')\nprint('b')"],["q5","print('a')\nprint('%.2e' % 0.0)\nprint('b')"],["q6","print('a')\nprint('{:.2e}'.format(0.0))\nprint('b')"]];
fs.writeFileSync('_work/v41/_p234l.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
