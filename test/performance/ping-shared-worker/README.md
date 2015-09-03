## Total (mean)

#### `342.35ms`

## Slow bits

1. Waiting for Worker - `~90ms`
2. 'connected' `.postMessage()` (`MessageChannel`) Worker -> Window - `~50ms`
3. `importScripts()` - `~40ms`
4. `new SharedWorker` - `~23ms`

## Full log

```bash
raptor test coldlaunch --runs 20 --app ping-worker
```

| Metric                                                                  | Mean    | Median  | Min     | Max     | StdDev | p95     |
| ----------------------------------------------------------------------- | ------- | ------- | ------- | ------- | ------ | ------- |
| coldlaunch.[App] app script start                                       | 272.750 | 272.000 | 251.000 | 293.000 | 13.747 | 292.500 |
| coldlaunch.[App] created worker                                         | 286.250 | 295.000 | 261.000 | 305.000 | 15.488 | 304.500 |
| coldlaunch.[Window][Client] - set port                                  | 291.050 | 298.500 | 264.000 | 314.000 | 15.220 | 310.500 |
| coldlaunch.[Window][Message] - receiver initialized                     | 294.150 | 301.500 | 266.000 | 321.000 | 15.077 | 315.500 |
| coldlaunch.[Window][Client] - initialized                               | 297.250 | 302.500 | 267.000 | 322.000 | 15.469 | 319.000 |
| coldlaunch.[App] created client                                         | 298.750 | 303.000 | 267.000 | 323.000 | 15.915 | 320.000 |
| coldlaunch.[Window][Client] - connect                                   | 300.450 | 304.000 | 268.000 | 323.000 | 15.838 | 321.500 |
| coldlaunch.[Window][Client] - connecting...                             | 301.950 | 305.500 | 270.000 | 324.000 | 15.970 | 323.500 |
| coldlaunch.[Window][Client] - create message                            | 304.650 | 308.000 | 273.000 | 326.000 | 15.311 | 325.500 |
| coldlaunch.[Window][Message] - initialized                              | 307.700 | 312.000 | 277.000 | 330.000 | 15.428 | 328.500 |
| coldlaunch.[Window][Message] - set                                      | 310.750 | 313.500 | 279.000 | 338.000 | 16.592 | 336.500 |
| coldlaunch.[Window][Message] - set (2)                                  | 312.200 | 315.000 | 280.000 | 339.000 | 16.836 | 337.500 |
| coldlaunch.[Window][Message] - set (3)                                  | 313.650 | 316.000 | 281.000 | 341.000 | 17.057 | 339.500 |
| coldlaunch.[Window][Message] - set (4)                                  | 314.900 | 317.000 | 282.000 | 342.000 | 17.326 | 341.000 |
| coldlaunch.[Window][Message] - add response listener                    | 316.100 | 318.000 | 283.000 | 345.000 | 17.567 | 343.000 |
| coldlaunch.[Window][Message] - send                                     | 318.400 | 319.000 | 284.000 | 348.000 | 17.016 | 346.000 |
| coldlaunch.[Window][Message] - add response listener (2)                | 320.700 | 320.000 | 300.000 | 348.000 | 15.931 | 348.000 |
| coldlaunch.[Window][Message] - sent                                     | 324.750 | 322.000 | 303.000 | 352.000 | 15.865 | 351.500 |
| coldlaunch.[App] sent ping                                              | 326.800 | 324.000 | 305.000 | 356.000 | 15.870 | 354.500 |
| coldlaunch.[App] service script start                                   | 412.550 | 412.500 | 385.000 | 438.000 | 14.288 | 435.500 |
| coldlaunch.[App] imported scripts                                       | 452.650 | 452.500 | 419.000 | 490.000 | 17.109 | 482.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - receiver initialized    | 453.650 | 453.500 | 421.000 | 491.000 | 17.124 | 483.500 |
| coldlaunch.[SharedWorkerGlobalScope][Service] - initialized             | 455.600 | 455.500 | 422.000 | 492.000 | 17.514 | 486.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - listen                  | 457.450 | 457.000 | 423.000 | 493.000 | 17.600 | 488.000 |
| coldlaunch.[App] service created                                        | 459.350 | 459.000 | 424.000 | 494.000 | 18.233 | 490.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - listen (2)              | 461.500 | 461.000 | 426.000 | 496.000 | 18.710 | 493.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - receiver on message     | 465.050 | 465.000 | 428.000 | 498.000 | 18.917 | 496.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - inbound                 | 467.250 | 466.500 | 430.000 | 505.000 | 19.725 | 501.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - set source              | 468.900 | 467.500 | 431.000 | 506.000 | 20.228 | 504.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - initialized             | 472.650 | 471.000 | 434.000 | 508.000 | 21.233 | 508.000 |
| coldlaunch.[SharedWorkerGlobalScope][Service] - connection attempt      | 475.150 | 474.500 | 435.000 | 510.000 | 21.226 | 509.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - set source (2)          | 477.100 | 475.500 | 437.000 | 513.000 | 21.302 | 512.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - listen (3)              | 478.900 | 479.500 | 438.000 | 516.000 | 21.815 | 515.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - respond                 | 481.200 | 483.500 | 439.000 | 519.000 | 22.910 | 518.500 |
| coldlaunch.[SharedWorkerGlobalScope][Service] - connected               | 483.500 | 485.500 | 440.000 | 525.000 | 23.474 | 523.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - resolve                 | 486.550 | 488.500 | 442.000 | 529.000 | 24.126 | 527.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - responded with:         | 488.400 | 490.000 | 443.000 | 532.000 | 24.436 | 529.500 |
| coldlaunch.[Window][Message] - on response                              | 543.650 | 540.000 | 514.000 | 620.000 | 27.043 | 602.000 |
| coldlaunch.[Window][Message] - remove response listeners                | 545.300 | 540.500 | 514.000 | 620.000 | 26.891 | 603.500 |
| coldlaunch.[Window][Client] - connected                                 | 550.300 | 543.000 | 517.000 | 624.000 | 27.798 | 607.500 |
| coldlaunch.[Window][Client] - set port (2)                              | 552.050 | 543.500 | 520.000 | 628.000 | 27.363 | 609.500 |
| coldlaunch.[Window][Message] - listen                                   | 554.150 | 545.000 | 521.000 | 631.000 | 27.098 | 611.500 |
| coldlaunch.[Window][Client] - method                                    | 556.400 | 547.000 | 522.000 | 633.000 | 26.880 | 613.500 |
| coldlaunch.[Window][Client] - create message (2)                        | 558.550 | 552.500 | 523.000 | 635.000 | 26.607 | 615.000 |
| coldlaunch.[Window][Message] - initialized (2)                          | 561.950 | 555.500 | 526.000 | 637.000 | 26.847 | 620.000 |
| coldlaunch.[Window][Message] - set (5)                                  | 563.550 | 556.500 | 527.000 | 638.000 | 27.312 | 621.000 |
| coldlaunch.[Window][Message] - set (6)                                  | 565.400 | 559.000 | 528.000 | 639.000 | 27.165 | 622.000 |
| coldlaunch.[Window][Message] - set (7)                                  | 569.100 | 562.000 | 530.000 | 640.000 | 26.709 | 624.000 |
| coldlaunch.[Window][Message] - send (2)                                 | 571.550 | 565.500 | 533.000 | 642.000 | 26.474 | 627.500 |
| coldlaunch.[Window][Message] - add response listener (3)                | 574.150 | 567.500 | 536.000 | 646.000 | 26.706 | 631.500 |
| coldlaunch.[Window][Message] - sent (2)                                 | 585.600 | 579.000 | 547.000 | 679.000 | 29.622 | 649.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - receiver on message (2) | 580.200 | 573.000 | 539.000 | 654.000 | 29.831 | 651.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - inbound (2)             | 582.600 | 575.500 | 540.000 | 655.000 | 29.479 | 653.000 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - set source (3)          | 584.400 | 577.000 | 541.000 | 657.000 | 29.549 | 654.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - initialized (2)         | 587.500 | 580.000 | 543.000 | 659.000 | 29.255 | 657.500 |
| coldlaunch.[SharedWorkerGlobalScope][Service] - on method               | 592.400 | 586.000 | 545.000 | 671.000 | 31.277 | 667.500 |
| coldlaunch.[App] got ping                                               | 596.000 | 589.000 | 547.000 | 671.000 | 30.394 | 668.000 |
| coldlaunch.[App] sent pong                                              | 598.200 | 590.500 | 556.000 | 672.000 | 29.683 | 669.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - respond (2)             | 599.950 | 594.000 | 556.000 | 673.000 | 29.760 | 671.500 |
| coldlaunch.[SharedWorkerGlobalScope][Message] - resolve (2)             | 603.150 | 598.000 | 558.000 | 681.000 | 30.085 | 676.500 |
| coldlaunch.[Window][Message] - on response (2)                          | 608.150 | 604.000 | 560.000 | 688.000 | 31.792 | 686.000 |
| coldlaunch.[Window][Message] - remove response listeners (2)            | 612.400 | 608.500 | 561.000 | 688.000 | 31.712 | 687.500 |
| coldlaunch.[App] got pong                                               | 615.100 | 610.000 | 563.000 | 691.000 | 31.954 | 690.500 |
| coldlaunch.fullyLoaded                                                  | 617.450 | 612.000 | 568.000 | 695.000 | 31.825 | 692.500 |
| coldlaunch.uss                                                          | 9.700   | 9.700   | 9.700   | 9.700   | 0.000  | 9.700   |
| coldlaunch.pss                                                          | 13.305  | 13.300  | 13.300  | 13.400  | 0.022  | 13.350  |
| coldlaunch.rss                                                          | 26.530  | 26.500  | 26.500  | 26.600  | 0.046  | 26.600  |
| coldlaunch.[SharedWorkerGlobalScope][Message] - responded with: (2)     | 608.500 | 609.000 | 567.000 | 675.000 | 28.419 | 675.000 |

### Device

Build ID               20150804150207
Gaia Revision          dddca9ffc5dfad2f074099b3ca27f5ba353a3f2b
Gaia Date              2015-08-19 15:04:17
Gecko Revision         https://hg.mozilla.org/mozilla-central/rev/f3b757156f69
Gecko Version          42.0a1
Device Name            flame
Firmware(Release)      4.4.2
Firmware(Incremental)  eng.cltbld.20150720.044158
Firmware Date          Mon Jul 20 04:42:10 EDT 2015
Bootloader             L1TC000118D0
