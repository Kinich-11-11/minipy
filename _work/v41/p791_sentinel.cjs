// P791: minimal delegated-generator throw forwarding fix for v4.248 / P783.
//
// Scope: only the gen-L4-01 case:
//   outer.throw(ValueError(...)) while outer is suspended in `yield from sub()`;
//   sub catches ValueError and yields a recovery value.
//
// Root cause in P783 (genResumeException783): when the delegated child is
// resumed with throw(), a child-side handled exception clears `error` and
// leaves the child alive with its new yield in `ev/evtype`. P783 then clears
// the outer GHyfOn flag and resumes the OUTER generator with the same
// exception, bypassing the child's catch continuation.
//
// This patch installs a narrow pre-dispatch arm before P783's G.throw arm.
// It parses the throw argument using the same ex232args/genThrowArg783 path,
// injects the exception into GHyfG, and, only when the child handled it and
// yielded, returns that child yield directly as the outer.throw result.
//
// Deliberate limits:
//   * throw() only; close(), 3-argument throw(), and non-yielding child
//     completion remain on the original P783 path.
//   * If the child does not handle the exception (error remains non-empty),
//     the original P783 path is allowed to propagate it.
//   * No changes are made to existing files by this script itself.
patch('P791 delegated yield-from throw forwarding (minimal)',()=>{
  const call=(p,...args)=>callProc(p,args);
  const a=n=>argOf(n),v=n=>VAR(n);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});

  for(const n of ['p791id','p791args','p791handled'])newVar(n,0);

  attachBody(newProc('yfThrowP791 %s %s %s',['xa','lo','hi']).defId,[
    setV('p791handled',num(2)),
    // xa is the parsed G#<gid> handle, matching genExceptionMeth783.
    call('substr %s %s %s',a('xa'),num(3),lenOf(a('xa'))),
    setV('p791id',v('ev')),
    IF(AND(GT(v('p791id'),num(0)),AND(
      EQ(item('GHyfOn',v('p791id')),num(1)),
      EQ(item('GHyfL',v('p791id')),num(0))
    )),[
      // Preserve P783's exact throw-argument parsing and validation.
      IF(NOT(GT(a('lo'),a('hi'))),[
        call('ex232args %s %s',a('lo'),a('hi')),
        IF(EQ(v('error'),txt('')),[
          setV('p791args',v('ev')),
          call('listlen %s',v('p791args')),
          IF(EQ(v('ev'),num(1)),[
            call('listitem %s %s',v('p791args'),num(1)),
            call('genThrowArg783 %s %s',v('ev'),v('evtype')),
            IF(EQ(v('error'),txt('')),[
              // Inject into the delegated child, not the outer generator.
              // Clear the outer dispatch error; the child call restores it if unhandled.
              setV('error',txt('')),
              call('genResumeException783 %s %s %s',item('GHyfG',v('p791id')),v('ev'),num(0)),
              // A caught exception that yields leaves the child alive and
              // places the recovery value in the shared ev/evtype result.
              IF(AND(EQ(v('error'),txt('')),EQ(item('GHdead',item('GHyfG',v('p791id'))),num(0))),[
                setV('evK',txt('')),
                setV('p791handled',num(1))
              ])
            ])
          ])
        ])
      ])
    ])
  ]);

  // Run before P783's existing G.close/G.throw dispatcher. A handled child
  // yield stops this script with ev/evtype intact; all other cases fall
  // through unchanged to genExceptionMeth783.
  insertBeforeStmt('bcontro_1aaal3ess',[
    IF(EQ(v('xb'),txt('G')),[
      call('nameEq776 %s %s',item('Tok',ADD(a('lo'),num(2))),txt('throw')),
      IF(EQ(v('cs776ok'),num(1)),[
        call('yfThrowP791 %s %s %s',v('xa'),ADD(a('lo'),num(4)),SUB(a('hi'),num(1))),
        IF(EQ(v('p791handled'),num(1)),[stop()])
      ])
    ])
  ]);

  console.log('[P791] minimal delegated yield-from throw forwarding installed');
});




