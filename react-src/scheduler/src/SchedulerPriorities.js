/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

// TODO: Use symbols?
// == 对应 Reconciler 等级
// ImmediatePriority = 1;    -> 99
// UserBlockingPriority = 2; -> 98
// NormalPriority = 3;       -> 97
// LowPriority = 4;          -> 96
// IdlePriority = 5;         -> 95
// NoPriority = 0;           -> 90
export const NoPriority = 0;
export const ImmediatePriority = 1;
export const UserBlockingPriority = 2;
export const NormalPriority = 3;
export const LowPriority = 4;
export const IdlePriority = 5;
