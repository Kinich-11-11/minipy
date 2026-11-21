const fs=require('fs');
const L=["print(round(0.5), round(1.5), round(2.5), round(3.5))","print('%.0f|%.0f|%.0f|%.0f' % (0.5,1.5,2.5,3.5))","print('%.1f|%.1f' % (0.25,0.35))","print(round(2.675, 2))","print('%.2f' % 2.675)","print('%.2e' % 3.5)","print('%.0e' % 3.5)","print('%.0e' % 1.5)","print('%.0e' % 2.5)"];
fs.writeFileSync('_work/v41/_p234h.json',JSON.stringify(L.map((c,i)=>({name:'t'+i,code:c}))));
