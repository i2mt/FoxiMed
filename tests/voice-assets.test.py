#!/usr/bin/env python3
"""Generated asset presence/signature regression, using temporary fixtures."""
import subprocess,sys,tempfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
names=['sherpa-onnx-asr.js','sherpa-onnx-vad.js','sherpa-onnx-wasm-main-vad-asr.js','sherpa-onnx-wasm-main-vad-asr.wasm','sherpa-onnx-wasm-main-vad-asr.data']
with tempfile.TemporaryDirectory() as tmp:
 assets=Path(tmp)/'sherpa-koochik';assets.mkdir()
 for name in names:(assets/name).write_bytes(b'\0asm\x01\0\0\0' if name.endswith('.wasm') else b'fixture')
 def check():return subprocess.run([sys.executable,str(root/'scripts/check-voice-assets.py'),tmp],capture_output=True,text=True)
 assert check().returncode==0
 p=assets/names[0];p.unlink();assert check().returncode!=0;p.write_text('<!doctype html><title>404</title>');assert check().returncode!=0;p.write_text('fixture')
 (assets/names[3]).write_text('not a WASM file');assert check().returncode!=0
print('voice asset validation checks: PASS (complete, missing, HTML fallback and invalid WASM)')
