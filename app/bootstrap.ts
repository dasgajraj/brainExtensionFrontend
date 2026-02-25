import { bootstrapThunk } from '../store/auth/auth.thunks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDispatch = (action: any) => any;

export function runBootstrap(dispatch: AnyDispatch): Promise<unknown> {
  return dispatch(bootstrapThunk());
}
