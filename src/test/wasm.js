/*
 * Copyright 2016 WebAssembly Community Group participants
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Support JavaScript code to run WebAssembly in a JavaScript shell.

var HEAP_SIZE_BYTES = 1 << 20;
var heap = new ArrayBuffer(HEAP_SIZE_BYTES);
var heap_uint8 = new Uint8Array(heap);

// Emulate <cstdlib>.
var EXIT_SUCCESS = 0;
var EXIT_FAILURE = 1;
var exit_code = 0;

// Emulate I/O.
// Don't use print() directly, instead use the buffered versions.
var stdout_buffer = '';
function buffered_print(msg) {
  print(stdout_buffer + msg);
  stdout_buffer = '';
}

function TerminateWasmException(value) {
  this.value = value;
  this.message = 'Terminating wasm';
  this.toString = function() { return this.message + ': ' + this.value; };
}

function NotYetImplementedException(what) {
  this.message = 'Not yet implemented';
  this.what = what;
  this.toString = function() { return this.message + ': ' + this.what; };
}

function abort() {
  exit_code = EXIT_FAILURE;
  throw new TerminateWasmException('abort()');
}

function exit(code) {
  exit_code = code;
  throw new TerminateWasmException('exit(' + code + ')');
}

function putchar(character) {
  character &= 0xff;
  stdout_buffer += String.fromCharCode(character);
  return character;
}

function puts(str) {
  for (var i = 0; heap_uint8[str + i] != 0; ++i)
    stdout_buffer += String.fromCharCode(heap_uint8[str + i]);
  stdout_buffer += '\n';
}


function memcpy(destination, source, num) {
  for (var i = 0; i != num; ++i)
    heap_uint8[destination + i] = heap_uint8[source + i];
  return destination;
}

function mempcpy(destination, source, num) {
  return num + memcpy(destination, source, num);
}

function memset(ptr, value, num) {
  for (var i = 0; i != num; ++i)
    heap_uint8[ptr + i] = value;
  return ptr;
}

function memcmp(ptr1, ptr2, num) {
  for (var i = 0; i != num; ++i)
    if (heap_uint8[ptr1 + i] != heap_uint8[ptr2 + i])
      return heap_uint8[ptr1 + i] < heap_uint8[ptr2 + i];
  return 0;
}

function strchr(str, character) {
  character &= 0xff;
  var i = 0;
  for (; heap_uint8[str + i] != 0; ++i)
    if (heap_uint8[str + i] == character)
      return i;
  if (heap_uint8[str + i] == 0)
    return i;
  return 0;
}

function strcmp(str1, str2) {
  for (var i = 0;; ++i)
    if (heap_uint8[str1 + i] != heap_uint8[str2 + i])
      return heap_uint8[str1 + i] < heap_uint8[str2 + i];
    else if (heap_uint8[str1 + i] == 0)
      break;
  return 0;
}

function strlen(str) {
  for (var i = 0;; ++i)
    if (heap_uint8[str + i] == 0)
      return i;
}

function NYI(what) {
  return function() { throw new NotYetImplementedException(what); };
}

var ffi = {
  print: buffered_print,
  abort: abort,
  exit: exit,
  memcpy: memcpy,
  mempcpy: mempcpy,
  memset: memset,
  memcmp: memcmp,
  strchr: strchr,
  strcmp: strcmp,
  strlen: strlen,
  putchar: putchar,
  puts: puts,
  strncpy: NYI('strncpy'),
  strrchr: NYI('strrchr'),
  strcpy: NYI('strcpy'),
  strncmp: NYI('strncmp'),
  malloc: NYI('malloc'),
  __builtin_malloc: NYI('__builtin_malloc'),
  free: NYI('free'),
  mmap: NYI('mmap'),
  open: NYI('open'),
  calloc: NYI('calloc'),
  printf: NYI('printf'),
  sprintf: NYI('sprintf'),
  isprint: NYI('isprint'),
  signal: NYI('signal'),
  qsort: NYI('qsort'),
  getpid: NYI('getpid'),
  _setjmp: NYI('_setjmp'),
  longjmp: NYI('longjmp'),
  __addtf3: NYI('__addtf3'),
  __builtin_apply: NYI('__builtin_apply'),
  __builtin_apply_args: NYI('__builtin_apply_args'),
  __builtin_isinff: NYI('__builtin_isinff'),
  __builtin_isinfl: NYI('__builtin_isinfl'),
  __divtf3: NYI('__divtf3'),
  __eqtf2: NYI('__eqtf2'),
  __fixsfti: NYI('__fixsfti'),
  __fixtfdi: NYI('__fixtfdi'),
  __fixtfsi: NYI('__fixtfsi'),
  __fixunstfdi: NYI('__fixunstfdi'),
  __fixunstfsi: NYI('__fixunstfsi'),
  __floatditf: NYI('__floatditf'),
  __floatsitf: NYI('__floatsitf'),
  __floatunditf: NYI('__floatunditf'),
  __floatunsitf: NYI('__floatunsitf'),
  __getf2: NYI('__getf2'),
  __gttf2: NYI('__gttf2'),
  __lttf2: NYI('__lttf2'),
  __multf3: NYI('__multf3'),
  __multi3: NYI('__multi3'),
  __netf2: NYI('__netf2'),
  __subtf3: NYI('__subtf3'),
};

var wasm = _WASMEXP_.instantiateModule(readbuffer(arguments[0]), ffi, heap);

try {
  // The entry point is assumed to be "main".
  wasm.main();
  buffered_print('Program terminated normally.');
} catch (e) {
  if (e instanceof TerminateWasmException) {
    buffered_print('Program terminated with: ' + e);
    if (exit_code != EXIT_SUCCESS) {
      throw exit_code;
    }
  } else if (e instanceof NotYetImplementedException) {
    buffered_print(e);
    throw e;
  } else {
    buffered_print('Unknown exception: ' + e);
    throw e;
  }
}
