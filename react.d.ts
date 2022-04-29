export type {ComponentType} from 'react';

declare module 'react' {
  // eslint-disable-next-line max-len
  export type RefForwardingComponent<
    T,
    P extends Record<string, unknown> = Record<string, unknown>,
  > = ForwardRefRenderFunction<T, P>;

  export type PropsWithChildren<P> = P & {children?: ReactNode | undefined};
}
