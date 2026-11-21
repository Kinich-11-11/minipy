const fs=require('fs');
const L=[["n1","print(4.35e18)\nprint(int(4.35e18))"],["n2","print('%.17e' % 4.35e18)\nprint('%.1e' % 4.35e18)\nprint('%.0e' % 4.35e18)"],["n3","print('%.1e' % 4350000000000000000)\nprint('%.1e' % 4.3500000000000005e18)"],["n4","print('%.2e' % 1.125)\nprint('%.1e' % 1.25)\nprint('%.1e' % 2.25)"]];
fs.writeFileSync('_work/v41/_p234n.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
