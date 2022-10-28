/* Copyright Contributors to the Open Cluster Management project */
export const NodeStatusIcons = () => (
    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="0" height="0">
        <symbol viewBox="0 0 16 16" id="nodeStatusIcon_success">
            <circle cx="8" cy="8" r="8" fill="white" fillOpacity="1" />
            <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zM6.7 11.5L3.4 8.1l1.4-1.4 1.9 1.9 4.1-4.1 1.4 1.4-5.5 5.6z" />
        </symbol>
        <symbol viewBox="6 6 28 28" id="nodeStatusIcon_warning">
            <g transform="scale(1.68)">
                <g id="Topology" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                    <g id="Artboard" transform="translate(-1474.000000, -1386.000000)">
                        <g id="DeployWarning" transform="translate(1474.000000, 1386.000000)">
                            <circle id="Oval" fill="#FFFFFF" cx="12" cy="12" r="9"></circle>
                            <g
                                id="Icons-/-14px-/-exclamation-triangle"
                                transform="translate(5.000000, 5.000000)"
                                fill="#F0AB00"
                            >
                                <path
                                    d="M13.8584965,10.7072806 C13.9882079,10.9667038 14.0287429,11.2301802 13.9801011,11.4977102 C13.9314593,11.7652402 13.8017479,11.9922352 13.5909665,12.1786956 C13.3801852,12.3651561 13.1288693,12.4583861 12.8370183,12.4583861 L1.16298166,12.4583861 C0.871130747,12.4583861 0.619814803,12.3651561 0.409033462,12.1786956 C0.19825212,11.9922352 0.0685407255,11.7652402 0.0198989061,11.4977102 C-0.0287429134,11.2301802 0.0117920599,10.9667038 0.141503455,10.7072806 L5.97852179,0.589782154 C6.12444725,0.330358993 6.33117498,0.156059387 6.59870499,0.0668825945 C6.866235,-0.0222941982 7.133765,-0.0222941982 7.40129501,0.0668825945 C7.66882502,0.156059387 7.87555275,0.330358993 8.02147821,0.589782154 L13.8584965,10.7072806 Z M7,8.61568237 C6.69193502,8.61568237 6.42845862,8.72512646 6.20957043,8.94401465 C5.99068225,9.16290284 5.88123815,9.42637923 5.88123815,9.73444421 C5.88123815,10.0425092 5.99068225,10.3059856 6.20957043,10.5248738 C6.42845862,10.743762 6.69193502,10.8532061 7,10.8532061 C7.30806498,10.8532061 7.57154138,10.743762 7.79042957,10.5248738 C8.00931775,10.3059856 8.11876185,10.0425092 8.11876185,9.73444421 C8.11876185,9.42637923 8.00931775,9.16290284 7.79042957,8.94401465 C7.57154138,8.72512646 7.30806498,8.61568237 7,8.61568237 Z M5.92987997,4.60273226 L6.12444725,7.91037598 C6.12444725,7.97523187 6.15282177,8.03603414 6.20957043,8.09278281 C6.2663191,8.14953147 6.33522859,8.17790599 6.41629817,8.17790599 L7.58370183,8.17790599 C7.66477141,8.17790599 7.7336809,8.14953147 7.79042957,8.09278281 C7.84717823,8.03603414 7.87555275,7.97523187 7.87555275,7.91037598 L8.07012003,4.60273226 C8.07012003,4.50544862 8.04174551,4.42843228 7.98499684,4.37168362 C7.92824818,4.31493495 7.85933869,4.28656043 7.77826911,4.28656043 L6.22173089,4.28656043 C6.14066131,4.28656043 6.07175182,4.31493495 6.01500316,4.37168362 C5.95825449,4.42843228 5.92987997,4.50544862 5.92987997,4.60273226 Z"
                                    id="exclamation-triangle"
                                ></path>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </symbol>
        <symbol viewBox="6 6 28 28" id="nodeStatusIcon_failure">
            <g transform="scale(1.68)">
                <circle id="Oval" fill="#FFFFFF" cx="12" cy="12" r="9"></circle>
                <path
                    d="M12,19 C15.8669355,19 19,15.8669355 19,12 C19,8.13306452 15.8669355,5 12,5 C8.13306452,5 5,8.13306452 5,12 C5,15.8669355 8.13306452,19 12,19 Z M9.68267232,15.432247 L8.56775296,14.3145161 C8.43508616,14.1818493 8.43508616,13.9673442 8.56775296,13.8346774 L10.4193548,12 L8.56775296,10.162511 C8.43508616,10.0298442 8.43508616,9.81531155 8.56775296,9.68267232 L9.68548387,8.56491384 C9.81815067,8.43224704 10.0326558,8.43224704 10.1653226,8.56491384 L12,10.4193548 L13.837489,8.56775296 C13.9701558,8.43508616 14.1846884,8.43508616 14.3173277,8.56775296 L15.4350862,9.68548387 C15.567753,9.81815067 15.567753,10.0326558 15.4350862,10.1653226 L13.5806452,12 L15.432247,13.837489 C15.5649138,13.9701558 15.5649138,14.1846884 15.432247,14.3173277 L14.3145161,15.432247 C14.1818493,15.5649138 13.9673442,15.5649138 13.8346774,15.432247 L12,13.5806452 L10.162511,15.432247 C10.0298442,15.5649138 9.81531155,15.5649138 9.68267232,15.432247 Z"
                    id="times-circle"
                    fill="#C9190B"
                ></path>
            </g>
        </symbol>
        <symbol viewBox="4 4 16 16" id="nodeStatusIcon_pending">
            <g id="Applications" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="2.1-App-9" transform="translate(-1151.000000, -1345.000000)">
                    <g id="Group-3" transform="translate(72.000000, 579.000000)">
                        <g id="Group-20-Copy-2" transform="translate(1079.000000, 766.000000)">
                            <circle id="Oval" fill="#FFFFFF" cx="12" cy="12" r="9"></circle>
                            <g
                                id="Icons/1.-Size-md-(16px)/Status/pficon-in-progress"
                                transform="translate(6.000000, 6.000000)"
                            >
                                <path
                                    d="M5.9941349,12 C6.40860215,12 6.80938416,11.9609375 7.19648094,11.8828125 C7.58357771,11.8046875 7.96089932,11.6875 8.32844575,11.53125 C8.68817204,11.375 9.028348,11.1894531 9.34897361,10.9746094 C9.66959922,10.7597656 9.96285435,10.515625 10.228739,10.2421875 C10.5024438,9.96875 10.7468231,9.67382812 10.9618768,9.35742188 C11.1769306,9.04101562 11.3626588,8.69921875 11.5190616,8.33203125 C11.6832845,7.97265625 11.8044966,7.59765625 11.8826979,7.20703125 C11.9608993,6.81640625 12,6.4140625 12,6 C12,5.5859375 11.9608993,5.18554688 11.8826979,4.79882812 C11.8044966,4.41210938 11.6832845,4.03515625 11.5190616,3.66796875 C11.3626588,3.30859375 11.1769306,2.96875 10.9618768,2.6484375 C10.7468231,2.328125 10.5024438,2.03515625 10.228739,1.76953125 C9.96285435,1.49609375 9.66959922,1.25195312 9.34897361,1.03710938 C9.028348,0.822265625 8.68817204,0.63671875 8.32844575,0.48046875 C7.96089932,0.31640625 7.58357771,0.1953125 7.19648094,0.1171875 C6.80938416,0.0390625 6.40860215,0 5.9941349,0 L5.9941349,1.6171875 C6.2913001,1.625 6.58064516,1.65625 6.86217009,1.7109375 C7.14369501,1.765625 7.4173998,1.8515625 7.68328446,1.96875 C7.94916911,2.0859375 8.19745846,2.22265625 8.42815249,2.37890625 C8.65884653,2.53515625 8.87585533,2.71484375 9.07917889,2.91796875 C9.28250244,3.12109375 9.46236559,3.33789062 9.61876833,3.56835938 C9.77517107,3.79882812 9.91202346,4.046875 10.0293255,4.3125 C10.1466276,4.5859375 10.2346041,4.86523438 10.2932551,5.15039062 C10.3519062,5.43554688 10.3812317,5.7265625 10.3812317,6.0234375 C10.3812317,6.328125 10.3519062,6.62304688 10.2932551,6.90820312 C10.2346041,7.19335938 10.1466276,7.47265625 10.0293255,7.74609375 C9.91202346,8.01171875 9.77517107,8.26171875 9.61876833,8.49609375 C9.46236559,8.73046875 9.28250244,8.9453125 9.07917889,9.140625 C8.87585533,9.34375 8.65884653,9.5234375 8.42815249,9.6796875 C8.19745846,9.8359375 7.94916911,9.97265625 7.68328446,10.0898438 C7.40957967,10.2070312 7.13000978,10.2929688 6.84457478,10.3476562 C6.55913978,10.4023438 6.26783969,10.4296875 5.97067449,10.4296875 C5.71260997,10.4296875 5.46432063,10.4101562 5.22580645,10.3710938 C4.98729228,10.3320312 4.75464321,10.2734375 4.52785924,10.1953125 L3.74193548,11.5664062 C4.09384164,11.7148438 4.45747801,11.8242188 4.83284457,11.8945312 C5.20821114,11.9648438 5.59530792,12 5.9941349,12 Z M0,5.578125 L1.59530792,5.47265625 C1.61876833,5.26953125 1.65591398,5.07226563 1.70674487,4.88085938 C1.75757576,4.68945313 1.82209189,4.50390625 1.90029326,4.32421875 C1.92375367,4.26953125 1.94721408,4.21679688 1.97067449,4.16601563 C1.9941349,4.11523438 2.02150538,4.0625 2.05278592,4.0078125 L0.633431085,3.3046875 C0.602150538,3.359375 0.572825024,3.41796875 0.545454545,3.48046875 C0.518084066,3.54296875 0.492668622,3.60546875 0.469208211,3.66796875 C0.336265885,3.97265625 0.230694037,4.28320313 0.152492669,4.59960938 C0.0742913001,4.91601563 0.0234604106,5.2421875 0,5.578125 Z M2.26392962,10.6992188 L3.04985337,9.328125 C3.01857283,9.296875 2.98533724,9.26757813 2.95014663,9.24023438 C2.91495601,9.21289063 2.88172043,9.18359375 2.85043988,9.15234375 C2.65493646,8.94921875 2.47702835,8.73046875 2.31671554,8.49609375 C2.15640274,8.26171875 2.01759531,8.01171875 1.90029326,7.74609375 C1.86119257,7.65234375 1.82600196,7.55859375 1.79472141,7.46484375 C1.76344086,7.37109375 1.73607038,7.27734375 1.71260997,7.18359375 L0.129032258,7.2890625 C0.168132942,7.46875 0.215053763,7.64648438 0.269794721,7.82226563 C0.324535679,7.99804688 0.391006843,8.16796875 0.469208211,8.33203125 C0.625610948,8.69921875 0.811339198,9.04101563 1.02639296,9.35742188 C1.24144673,9.67382813 1.485826,9.96875 1.75953079,10.2421875 C1.83773216,10.328125 1.91788856,10.4082031 2,10.4824219 C2.08211144,10.5566406 2.17008798,10.6289063 2.26392962,10.6992188 Z"
                                    id="pficon-in-progress"
                                    fill="#151515"
                                ></path>
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </symbol>
        <symbol viewBox="0 0 32 24" id="nodeStatusIcon_clusterCount">
            <rect
                x="2px"
                y="2px"
                width="28px"
                height="20px"
                stroke="#c7c7c7"
                fill="white"
                strokeWidth="1.5"
                rx="9px"
                ry="9px"
            />
        </symbol>
    </svg>
)
