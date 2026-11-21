const fs=require('fs');
const L=["print('%.6e' % 2.675)","print('%.0e' % 2.675)","print('%.1e' % 2.675)","x = 2.675\nprint('%.6e' % x)","print('%.6e' % 1.5)","print('%.6e' % 7.0)","print('%.6e' % 12.0)","print('%.6e' % 6.25)","print('%.6e' % 0.5)","print('%.6e' % 1.0)","print('%.6e' % 0.1)","print('%.6e' % 123.0)"];
fs.writeFileSync('_work/v41/_p234d.json',JSON.stringify(L.map((c,i)=>({name:'m'+i,code:c}))));
