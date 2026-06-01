cmake_minimum_required(VERSION 3.16)
project(AstraChessEngine VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(ENGINE_SOURCES
    src/board.cpp
    src/movegen.cpp
    src/eval.cpp
    src/search.cpp
    src/wasm_api.cpp
)

# Include directory
include_directories(include)

if(EMSCRIPTEN)
    # ============================
    # WebAssembly Build (Emscripten)
    # ============================
    add_executable(chess_engine ${ENGINE_SOURCES})
    
    set_target_properties(chess_engine PROPERTIES
        OUTPUT_NAME "chess_engine"
        SUFFIX ".js"
    )

    # Emscripten-specific flags
    target_compile_options(chess_engine PRIVATE -O3 -flto)
    
    target_link_options(chess_engine PRIVATE
        -O3
        -flto
        -s MODULARIZE=1
        -s EXPORT_ES6=1
        -s EXPORT_NAME='ChessEngineModule'
        -s ENVIRONMENT='web,worker'
        -s ALLOW_MEMORY_GROWTH=1
        -s INITIAL_MEMORY=16777216
        -s NO_EXIT_RUNTIME=1
        -s EXPORTED_FUNCTIONS=['_engine_init','_engine_new_game','_engine_load_fen','_engine_search','_engine_get_legal_moves','_engine_get_fen','_engine_make_move','_engine_is_in_check','_engine_get_halfmove_clock','_engine_is_threefold_repetition','_engine_is_white_to_move','_engine_get_board_squares']
        -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','stringToUTF8','lengthBytesUTF8','_malloc','_free']
    )

else()
    # ============================
    # Native Build (for testing)
    # ============================
    
    # Engine library
    add_library(chess_engine_lib STATIC ${ENGINE_SOURCES})
    target_include_directories(chess_engine_lib PUBLIC include)
    target_compile_options(chess_engine_lib PRIVATE -O2 -Wall -Wextra)

    # Test executable
    add_executable(chess_test src/main.cpp)
    target_link_libraries(chess_test chess_engine_lib)
    target_compile_options(chess_test PRIVATE -O2 -Wall -Wextra)

endif()
