## Total (mean)

#### `253.25ms`

## Slow bits

1. Waiting for iframe script start - `~70ms`
2. 'connect' `.postMessage()` Window -> Window - `~40ms`

## Full log

```bash
raptor test coldlaunch --runs 20 --app ping-iframe
```

| Metric                                                       | Mean    | Median  | Min     | Max     | StdDev | p95     |
| ------------------------------------------------------------ | ------- | ------- | ------- | ------- | ------ | ------- |
| coldlaunch.[App] app script start                            | 312.700 | 307.500 | 282.000 | 371.000 | 20.550 | 361.500 |
| coldlaunch.[Window][Client] - set port                       | 319.300 | 315.000 | 294.000 | 376.000 | 19.887 | 367.000 |
| coldlaunch.[Window][Message] - receiver initialized          | 323.350 | 318.000 | 304.000 | 379.000 | 19.337 | 370.500 |
| coldlaunch.[Window][Client] - initialized                    | 325.050 | 320.000 | 306.000 | 380.000 | 19.153 | 371.500 |
| coldlaunch.[App] created client                              | 326.150 | 321.000 | 306.000 | 381.000 | 19.280 | 372.500 |
| coldlaunch.[Window][Client] - connect                        | 327.500 | 322.000 | 307.000 | 383.000 | 19.691 | 374.000 |
| coldlaunch.[Window][Client] - connecting...                  | 328.750 | 323.000 | 308.000 | 385.000 | 19.930 | 375.500 |
| coldlaunch.[Window][Client] - create message                 | 331.300 | 327.000 | 310.000 | 388.000 | 20.020 | 379.000 |
| coldlaunch.[Window][Message] - initialized                   | 333.250 | 329.000 | 311.000 | 390.000 | 20.334 | 382.000 |
| coldlaunch.[Window][Message] - set                           | 334.600 | 329.500 | 312.000 | 391.000 | 20.587 | 384.000 |
| coldlaunch.[Window][Message] - set (2)                       | 336.650 | 332.500 | 314.000 | 393.000 | 20.667 | 387.000 |
| coldlaunch.[Window][Message] - set (3)                       | 338.150 | 333.500 | 316.000 | 395.000 | 20.900 | 389.000 |
| coldlaunch.[Window][Message] - set (4)                       | 339.450 | 334.500 | 316.000 | 396.000 | 21.519 | 390.500 |
| coldlaunch.[Window][Message] - add response listener         | 340.700 | 335.500 | 317.000 | 398.000 | 21.769 | 392.500 |
| coldlaunch.[Window][Message] - send                          | 342.200 | 336.500 | 318.000 | 399.000 | 21.887 | 394.500 |
| coldlaunch.[Window][Message] - add response listener (2)     | 343.600 | 337.000 | 319.000 | 401.000 | 22.263 | 397.000 |
| coldlaunch.[Window][Message] - sent                          | 345.550 | 339.500 | 321.000 | 404.000 | 22.651 | 400.000 |
| coldlaunch.[App] sent ping                                   | 347.200 | 340.500 | 322.000 | 406.000 | 22.866 | 402.500 |
| coldlaunch.[App] service script start                        | 420.200 | 411.500 | 383.000 | 476.000 | 25.268 | 474.000 |
| coldlaunch.[Window][Message] - receiver initialized (2)      | 421.500 | 412.500 | 384.000 | 477.000 | 24.945 | 475.000 |
| coldlaunch.[Window][Service] - initialized                   | 424.500 | 414.000 | 386.000 | 482.000 | 27.115 | 482.000 |
| coldlaunch.[Window][Message] - listen                        | 425.800 | 415.500 | 387.000 | 483.000 | 27.230 | 483.000 |
| coldlaunch.[App] service created                             | 428.000 | 418.500 | 388.000 | 487.000 | 27.526 | 485.500 |
| coldlaunch.[Window][Message] - receiver on message           | 468.550 | 455.500 | 420.000 | 550.000 | 34.342 | 542.000 |
| coldlaunch.[Window][Message] - inbound                       | 469.700 | 456.500 | 420.000 | 551.000 | 34.454 | 543.000 |
| coldlaunch.[Window][Message] - set source                    | 471.450 | 458.000 | 422.000 | 552.000 | 34.390 | 544.500 |
| coldlaunch.[Window][Message] - initialized (2)               | 475.600 | 461.000 | 423.000 | 567.000 | 37.048 | 557.000 |
| coldlaunch.[Window][Service] - connection attempt            | 477.850 | 463.500 | 425.000 | 568.000 | 36.853 | 558.000 |
| coldlaunch.[Window][Message] - set source (2)                | 480.900 | 466.000 | 427.000 | 571.000 | 36.957 | 561.500 |
| coldlaunch.[Window][Message] - listen (2)                    | 483.550 | 469.000 | 428.000 | 583.000 | 38.404 | 569.000 |
| coldlaunch.[Window][Message] - respond                       | 485.950 | 471.500 | 429.000 | 584.000 | 38.756 | 572.000 |
| coldlaunch.[Window][Service] - connected                     | 487.950 | 473.000 | 431.000 | 586.000 | 39.219 | 575.000 |
| coldlaunch.[Window][Message] - resolve                       | 489.650 | 475.000 | 434.000 | 588.000 | 39.440 | 577.500 |
| coldlaunch.[Window][Message] - responded with:               | 493.000 | 477.500 | 437.000 | 598.000 | 40.813 | 584.000 |
| coldlaunch.[Window][Message] - on response                   | 502.800 | 486.500 | 443.000 | 602.000 | 40.817 | 592.000 |
| coldlaunch.[Window][Message] - remove response listeners     | 504.400 | 487.500 | 444.000 | 605.000 | 41.641 | 597.000 |
| coldlaunch.[Window][Client] - connected                      | 507.550 | 491.000 | 449.000 | 608.000 | 41.654 | 600.000 |
| coldlaunch.[Window][Client] - set port (2)                   | 509.550 | 494.000 | 450.000 | 613.000 | 42.281 | 604.000 |
| coldlaunch.[Window][Message] - listen (3)                    | 511.150 | 494.500 | 456.000 | 614.000 | 42.087 | 605.500 |
| coldlaunch.[Window][Client] - method                         | 512.800 | 496.000 | 457.000 | 615.000 | 42.288 | 608.000 |
| coldlaunch.[Window][Client] - create message (2)             | 514.450 | 501.000 | 458.000 | 616.000 | 42.233 | 608.500 |
| coldlaunch.[Window][Message] - initialized (3)               | 517.050 | 503.000 | 459.000 | 618.000 | 42.988 | 611.000 |
| coldlaunch.[Window][Message] - set (5)                       | 518.750 | 508.500 | 460.000 | 619.000 | 43.103 | 613.000 |
| coldlaunch.[Window][Message] - set (6)                       | 519.800 | 509.000 | 461.000 | 619.000 | 43.475 | 615.000 |
| coldlaunch.[Window][Message] - set (7)                       | 522.250 | 510.000 | 467.000 | 623.000 | 43.785 | 619.000 |
| coldlaunch.[Window][Message] - send (2)                      | 524.600 | 513.500 | 469.000 | 628.000 | 44.339 | 622.500 |
| coldlaunch.[Window][Message] - add response listener (3)     | 526.400 | 514.500 | 470.000 | 630.000 | 44.886 | 625.000 |
| coldlaunch.[Window][Message] - sent (2)                      | 529.400 | 516.500 | 472.000 | 633.000 | 44.716 | 628.000 |
| coldlaunch.[Window][Message] - receiver on message (2)       | 534.900 | 523.000 | 474.000 | 637.000 | 46.481 | 633.500 |
| coldlaunch.[Window][Message] - inbound (2)                   | 537.650 | 526.500 | 476.000 | 640.000 | 46.004 | 636.000 |
| coldlaunch.[Window][Message] - set source (3)                | 539.450 | 527.500 | 477.000 | 644.000 | 46.480 | 639.500 |
| coldlaunch.[Window][Message] - initialized (4)               | 541.250 | 528.500 | 478.000 | 646.000 | 46.885 | 641.500 |
| coldlaunch.[Window][Service] - on method                     | 545.450 | 532.000 | 481.000 | 650.000 | 48.146 | 645.000 |
| coldlaunch.[App] got ping                                    | 547.200 | 535.000 | 482.000 | 652.000 | 48.374 | 647.500 |
| coldlaunch.[App] sent pong                                   | 548.850 | 536.000 | 483.000 | 655.000 | 48.986 | 650.500 |
| coldlaunch.[Window][Message] - respond (2)                   | 551.050 | 538.000 | 484.000 | 658.000 | 49.949 | 654.500 |
| coldlaunch.[Window][Message] - resolve (2)                   | 553.300 | 539.500 | 485.000 | 662.000 | 50.627 | 657.500 |
| coldlaunch.[Window][Message] - responded with: (2)           | 555.950 | 542.000 | 487.000 | 665.000 | 51.040 | 660.000 |
| coldlaunch.[Window][Message] - on response (2)               | 559.900 | 547.500 | 495.000 | 668.000 | 51.105 | 664.000 |
| coldlaunch.[Window][Message] - remove response listeners (2) | 561.300 | 548.000 | 495.000 | 670.000 | 51.596 | 666.500 |
| coldlaunch.[App] got pong                                    | 563.750 | 550.000 | 497.000 | 673.000 | 52.028 | 668.500 |
| coldlaunch.fullyLoaded                                       | 565.950 | 551.000 | 498.000 | 677.000 | 53.060 | 671.000 |
| coldlaunch.pss                                               | 12.485  | 12.500  | 12.400  | 12.500  | 0.036  | 12.500  |
| coldlaunch.uss                                               | 8.905   | 8.900   | 8.900   | 9.000   | 0.022  | 8.950   |
| coldlaunch.rss                                               | 25.600  | 25.600  | 25.600  | 25.600  | 0.000  | 25.600  |

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
