const fs=require('fs');
const base="class N:\n    def __init__(self, v, nx=None):\n        self.v = v\n        self.nx = nx\na = N(1)\nb = N(2, a)\nc = N(3, b)\nd = N(4, c)\n";
const L=[
["two_level_aug", base+"a.v += 5\nprint(a.v)"],
["two_attr_aug", base+"c.nx.v += 5\nprint(b.v)"],
["three_attr_aug", base+"c.nx.nx.v += 5\nprint(a.v)"],
["four_attr_aug", base+"d.nx.nx.nx.v += 5\nprint(a.v)"],
["three_plain_assign", base+"c.nx.nx.v = 7\nprint(a.v)"],
["three_aug_minus", base+"c.nx.nx.v -= 1\nprint(a.v)"],
["three_aug_str", base+"a.v = 'ab'\nc.nx.nx = a\nc.nx.nx.v += 'cd'\nprint(a.v)"]
];
fs.writeFileSync('_work/v41/_p234f.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
