cd v8
git reset --hard $1
git apply $2
gclient sync -D
gn gen out/x64_ctf.release --args='v8_monolithic=true v8_use_external_startup_data=false is_component_build=false is_debug=false target_cpu="x64" use_goma=false goma_dir="None" v8_enable_backtrace=true v8_enable_disassembler=true v8_enable_object_print=true v8_enable_verify_heap=true'
ninja -c out/x64_ctf.release d8
