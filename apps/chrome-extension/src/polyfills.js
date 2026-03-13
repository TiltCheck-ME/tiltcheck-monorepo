/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;
window.global = window;
