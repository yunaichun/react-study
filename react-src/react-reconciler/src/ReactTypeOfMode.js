/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
// 0x 十六进制
// d(decimal) 十进制
// b（binary） 二进制

export type TypeOfMode = number;

// == tag 决定了 创建 FiberNode  的模式
// == NoMode - 0 
export const NoMode = 0b00000;
// == StrictMode - 1
export const StrictMode = 0b00001;
// TODO: Remove BlockingMode and ConcurrentMode by reading from the root
// tag instead
// == BlockingMode - 2
export const BlockingMode = 0b00010;
// == ConcurrentMode - 4
export const ConcurrentMode = 0b00100;
// == ProfileMode - 8
export const ProfileMode = 0b01000;
// == DebugTracingMode - 16
export const DebugTracingMode = 0b10000;
