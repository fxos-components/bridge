## Total (mean)

#### `309.45ms`

## Slow bits

1. Waiting for Worker - `~90ms`
2. 'connected' `.postMessage()` (`MessageChannel`) Worker -> Window - `~60ms`
3. Worker `importScripts()` - `~40ms`

## Full log

```bash
raptor test coldlaunch --runs 20 --app ping-worker
```

| Metric                                                                     | Mean    | Median  | Min     | Max     | StdDev | p95     |
| -------------------------------------------------------------------------- | ------- | ------- | ------- | ------- | ------ | ------- |
| coldlaunch.[App] app script start                                          | 282.250 | 278.500 | 253.000 | 319.000 | 17.432 | 313.500 |
| coldlaunch.[App] created worker                                            | 293.400 | 291.000 | 262.000 | 328.000 | 17.244 | 325.500 |
| coldlaunch.[Window][Client] - set port                                     | 297.300 | 295.000 | 265.000 | 331.000 | 16.614 | 328.500 |
| coldlaunch.[Window][Message] - receiver initialized                        | 300.400 | 297.500 | 266.000 | 332.000 | 16.305 | 330.500 |
| coldlaunch.[Window][Client] - initialized                                  | 302.150 | 299.500 | 267.000 | 333.000 | 16.060 | 331.500 |
| coldlaunch.[App] created client                                            | 303.400 | 301.000 | 267.000 | 333.000 | 15.979 | 332.000 |
| coldlaunch.[Window][Client] - connect                                      | 304.550 | 301.500 | 268.000 | 333.000 | 16.042 | 332.000 |
| coldlaunch.[Window][Client] - connecting...                                | 305.500 | 303.500 | 269.000 | 334.000 | 16.148 | 333.000 |
| coldlaunch.[Window][Client] - create message                               | 307.900 | 306.000 | 270.000 | 335.000 | 15.990 | 334.000 |
| coldlaunch.[Window][Message] - initialized                                 | 310.600 | 309.500 | 273.000 | 337.000 | 16.123 | 336.500 |
| coldlaunch.[Window][Message] - set                                         | 313.950 | 311.500 | 277.000 | 338.000 | 14.931 | 337.500 |
| coldlaunch.[Window][Message] - set (2)                                     | 315.400 | 313.000 | 278.000 | 339.000 | 14.951 | 338.500 |
| coldlaunch.[Window][Message] - set (3)                                     | 317.450 | 317.000 | 280.000 | 340.000 | 14.874 | 340.000 |
| coldlaunch.[Window][Message] - set (4)                                     | 318.650 | 317.500 | 280.000 | 343.000 | 15.405 | 342.000 |
| coldlaunch.[Window][Message] - add response listener                       | 320.100 | 320.000 | 281.000 | 345.000 | 15.257 | 343.000 |
| coldlaunch.[Window][Message] - send                                        | 321.900 | 321.500 | 282.000 | 348.000 | 15.962 | 345.500 |
| coldlaunch.[Window][Message] - add response listener (2)                   | 323.000 | 323.000 | 283.000 | 351.000 | 16.134 | 347.500 |
| coldlaunch.[Window][Message] - sent                                        | 325.350 | 326.000 | 285.000 | 354.000 | 16.393 | 350.500 |
| coldlaunch.[App] sent ping                                                 | 327.150 | 328.000 | 286.000 | 357.000 | 16.626 | 353.500 |
| coldlaunch.[App] service script start                                      | 412.350 | 410.000 | 380.000 | 451.000 | 16.101 | 442.000 |
| coldlaunch.[App] imported scripts                                          | 454.250 | 450.500 | 417.000 | 519.000 | 23.100 | 505.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - receiver initialized    | 455.700 | 452.000 | 417.000 | 520.000 | 23.626 | 509.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Service] - initialized             | 457.650 | 454.500 | 419.000 | 522.000 | 23.728 | 511.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - listen                  | 458.700 | 455.500 | 420.000 | 523.000 | 23.839 | 511.500 |
| coldlaunch.[App] service created                                           | 460.700 | 457.500 | 421.000 | 531.000 | 24.874 | 516.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - receiver on message     | 463.100 | 460.000 | 423.000 | 534.000 | 25.129 | 518.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - inbound                 | 465.500 | 462.500 | 424.000 | 536.000 | 26.070 | 520.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - set source              | 466.750 | 463.500 | 425.000 | 537.000 | 26.476 | 522.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - initialized             | 468.500 | 465.000 | 426.000 | 540.000 | 26.815 | 524.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Service] - connection attempt      | 471.300 | 467.000 | 428.000 | 550.000 | 28.415 | 533.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - set source (2)          | 473.350 | 468.000 | 429.000 | 551.000 | 28.833 | 534.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - listen (2)              | 474.750 | 469.500 | 430.000 | 553.000 | 28.953 | 535.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - respond                 | 477.100 | 471.500 | 431.000 | 555.000 | 29.762 | 541.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Service] - connected               | 478.850 | 472.500 | 432.000 | 557.000 | 30.057 | 543.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - resolve                 | 480.450 | 473.500 | 433.000 | 560.000 | 30.160 | 545.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - responded with:         | 482.550 | 475.000 | 435.000 | 565.000 | 30.685 | 548.500 |
| coldlaunch.[Window][Message] - on response                                 | 535.200 | 537.500 | 489.000 | 570.000 | 22.239 | 569.000 |
| coldlaunch.[Window][Message] - remove response listeners                   | 536.850 | 539.000 | 491.000 | 573.000 | 22.725 | 571.500 |
| coldlaunch.[Window][Client] - connected                                    | 540.250 | 542.000 | 498.000 | 579.000 | 23.128 | 577.500 |
| coldlaunch.[Window][Client] - set port (2)                                 | 542.050 | 542.500 | 500.000 | 581.000 | 23.519 | 580.500 |
| coldlaunch.[Window][Message] - listen                                      | 543.550 | 544.500 | 501.000 | 583.000 | 23.621 | 582.000 |
| coldlaunch.[Window][Client] - method                                       | 546.150 | 546.500 | 501.000 | 586.000 | 23.635 | 585.000 |
| coldlaunch.[Window][Client] - create message (2)                           | 548.700 | 549.000 | 503.000 | 597.000 | 24.613 | 592.500 |
| coldlaunch.[Window][Message] - initialized (2)                             | 551.550 | 551.000 | 505.000 | 598.000 | 23.888 | 594.000 |
| coldlaunch.[Window][Message] - set (5)                                     | 554.100 | 552.500 | 507.000 | 599.000 | 23.507 | 596.000 |
| coldlaunch.[Window][Message] - set (6)                                     | 555.250 | 553.000 | 508.000 | 600.000 | 23.533 | 598.000 |
| coldlaunch.[Window][Message] - set (7)                                     | 556.850 | 554.000 | 509.000 | 601.000 | 23.673 | 600.000 |
| coldlaunch.[Window][Message] - send (2)                                    | 559.100 | 555.500 | 512.000 | 602.000 | 23.121 | 602.000 |
| coldlaunch.[Window][Message] - add response listener (3)                   | 561.350 | 559.500 | 514.000 | 610.000 | 23.707 | 607.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - receiver on message (2) | 565.650 | 563.000 | 516.000 | 612.000 | 23.348 | 610.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - inbound (2)             | 567.250 | 564.500 | 517.000 | 614.000 | 23.832 | 613.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - set source (3)          | 568.650 | 565.500 | 519.000 | 615.000 | 23.783 | 615.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - initialized (2)         | 570.050 | 566.500 | 520.000 | 618.000 | 23.792 | 617.000 |
| coldlaunch.[Window][Message] - sent (2)                                    | 573.150 | 568.500 | 525.000 | 620.000 | 23.934 | 615.500 |
| coldlaunch.[DedicatedWorkerGlobalScope][Service] - on method               | 573.800 | 568.500 | 521.000 | 621.000 | 23.790 | 619.500 |
| coldlaunch.[App] got ping                                                  | 576.200 | 572.500 | 522.000 | 622.000 | 23.937 | 620.500 |
| coldlaunch.[App] sent pong                                                 | 577.800 | 573.500 | 523.000 | 631.000 | 25.047 | 627.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - respond (2)             | 578.850 | 574.500 | 524.000 | 631.000 | 24.767 | 627.000 |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - resolve (2)             | 581.150 | 579.000 | 526.000 | 634.000 | 24.364 | 629.000 |
| coldlaunch.[Window][Message] - on response (2)                             | 585.250 | 580.500 | 530.000 | 643.000 | 26.165 | 639.000 |
| coldlaunch.[Window][Message] - remove response listeners (2)               | 587.900 | 583.000 | 532.000 | 644.000 | 26.092 | 639.500 |
| coldlaunch.[App] got pong                                                  | 590.350 | 586.500 | 533.000 | 648.000 | 26.377 | 643.000 |
| coldlaunch.fullyLoaded                                                     | 591.700 | 587.500 | 534.000 | 649.000 | 26.614 | 644.500 |
| coldlaunch.pss                                                             | 13.295  | 13.300  | 13.200  | 13.300  | 0.022  | 13.300  |
| coldlaunch.uss                                                             | 9.610   | 9.600   | 9.600   | 9.700   | 0.030  | 9.700   |
| coldlaunch.rss                                                             | 26.520  | 26.500  | 26.500  | 26.800  | 0.068  | 26.700  |
| coldlaunch.[DedicatedWorkerGlobalScope][Message] - responded with: (2)     | 586.313 | 586.000 | 531.000 | 646.000 | 25.738 | 636.700 |13.250  |

### Device

- Build ID               20150804150207
- Gaia Revision          dddca9ffc5dfad2f074099b3ca27f5ba353a3f2b
- Gaia Date              2015-08-19 15:04:17
- Gecko Revision         https://hg.mozilla.org/mozilla-central/rev/f3b757156f69
- Gecko Version          42.0a1
- Device Name            flame
- Firmware(Release)      4.4.2
- Firmware(Incremental)  eng.cltbld.20150720.044158
- Firmware Date          Mon Jul 20 04:42:10 EDT 2015
- Bootloader             L1TC000118D0
