#!/usr/bin/env python3
"""Check the generated Pages voice bundle. Usage: python3 scripts/check-voice-assets.py _site"""
import sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')/'sherpa-koochik'
required=['sherpa-onnx-asr.js','sherpa-onnx-vad.js','sherpa-onnx-wasm-main-vad-asr.js','sherpa-onnx-wasm-main-vad-asr.wasm','sherpa-onnx-wasm-main-vad-asr.data']
errors=[]
for name in required:
 p=root/name
 if not p.is_file() or p.stat().st_size==0:errors.append('missing or empty: '+str(p));continue
 with p.open('rb') as f:head=f.read(512)
 if head.lstrip().lower().startswith((b'<!doctype html',b'<html')):errors.append('HTML fallback instead of runtime: '+str(p))
 if name.endswith('.wasm') and not head.startswith(b'\0asm'):errors.append('invalid WebAssembly signature: '+str(p))
if errors:
 print('\n'.join(errors),file=sys.stderr);raise SystemExit(1)
print('Generated voice assets: PASS (three scripts, WASM and model data)')
