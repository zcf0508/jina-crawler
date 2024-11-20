Title: Vitest

URL Source: https://vitest.dev/api/expect-typeof

Markdown Content:
expectTypeOf [​](https://vitest.dev/api/expect-typeof#expecttypeof)
-------------------------------------------------------------------

WARNING

During runtime this function doesn't do anything. To [enable typechecking](https://vitest.dev/guide/testing-types#run-typechecking), don't forget to pass down `--typecheck` flag.

*   **Type:** `<T>(a: unknown) => ExpectTypeOf`

not [​](https://vitest.dev/api/expect-typeof#not)
-------------------------------------------------

*   **Type:** `ExpectTypeOf`

You can negate all assertions, using `.not` property.

toEqualTypeOf [​](https://vitest.dev/api/expect-typeof#toequaltypeof)
---------------------------------------------------------------------

*   **Type:** `<T>(expected: T) => void`

This matcher will check if the types are fully equal to each other. This matcher will not fail if two objects have different values, but the same type. It will fail however if an object is missing a property.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: number }>()
expectTypeOf({ a: 1 }).toEqualTypeOf({ a: 1 })
expectTypeOf({ a: 1 }).toEqualTypeOf({ a: 2 })
expectTypeOf({ a: 1, b: 1 }).not.toEqualTypeOf<{ a: number }>()
```

toMatchTypeOf [​](https://vitest.dev/api/expect-typeof#tomatchtypeof)
---------------------------------------------------------------------

*   **Type:** `<T>(expected: T) => void`

This matcher checks if expect type extends provided type. It is different from `toEqual` and is more similar to [expect's](https://vitest.dev/api/expect) `toMatchObject()`. With this matcher, you can check if an object “matches” a type.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf({ a: 1, b: 1 }).toMatchTypeOf({ a: 1 })
expectTypeOf<number>().toMatchTypeOf<string | number>()
expectTypeOf<string | number>().not.toMatchTypeOf<number>()
```

extract [​](https://vitest.dev/api/expect-typeof#extract)
---------------------------------------------------------

*   **Type:** `ExpectTypeOf<ExtractedUnion>`

You can use `.extract` to narrow down types for further testing.

ts

```
import { expectTypeOf } from 'vitest'

type ResponsiveProp<T> = T | T[] | { xs?: T; sm?: T; md?: T }

interface CSSProperties { margin?: string; padding?: string }

function getResponsiveProp<T>(_props: T): ResponsiveProp<T> {
  return {}
}

const cssProperties: CSSProperties = { margin: '1px', padding: '2px' }

expectTypeOf(getResponsiveProp(cssProperties))
  .extract<{ xs?: any }>() // extracts the last type from a union
  .toEqualTypeOf<{ xs?: CSSProperties; sm?: CSSProperties; md?: CSSProperties }>()

expectTypeOf(getResponsiveProp(cssProperties))
  .extract<unknown[]>() // extracts an array from a union
  .toEqualTypeOf<CSSProperties[]>()
```

WARNING

If no type is found in the union, `.extract` will return `never`.

exclude [​](https://vitest.dev/api/expect-typeof#exclude)
---------------------------------------------------------

*   **Type:** `ExpectTypeOf<NonExcludedUnion>`

You can use `.exclude` to remove types from a union for further testing.

ts

```
import { expectTypeOf } from 'vitest'

type ResponsiveProp<T> = T | T[] | { xs?: T; sm?: T; md?: T }

interface CSSProperties { margin?: string; padding?: string }

function getResponsiveProp<T>(_props: T): ResponsiveProp<T> {
  return {}
}

const cssProperties: CSSProperties = { margin: '1px', padding: '2px' }

expectTypeOf(getResponsiveProp(cssProperties))
  .exclude<unknown[]>()
  .exclude<{ xs?: unknown }>() // or just .exclude<unknown[] | { xs?: unknown }>()
  .toEqualTypeOf<CSSProperties>()
```

WARNING

If no type is found in the union, `.exclude` will return `never`.

returns [​](https://vitest.dev/api/expect-typeof#returns)
---------------------------------------------------------

*   **Type:** `ExpectTypeOf<ReturnValue>`

You can use `.returns` to extract return value of a function type.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(() => {}).returns.toBeVoid()
expectTypeOf((a: number) => [a, a]).returns.toEqualTypeOf([1, 2])
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

parameters [​](https://vitest.dev/api/expect-typeof#parameters)
---------------------------------------------------------------

*   **Type:** `ExpectTypeOf<Parameters>`

You can extract function arguments with `.parameters` to perform assertions on its value. Parameters are returned as an array.

ts

```
import { expectTypeOf } from 'vitest'

type NoParam = () => void
type HasParam = (s: string) => void

expectTypeOf<NoParam>().parameters.toEqualTypeOf<[]>()
expectTypeOf<HasParam>().parameters.toEqualTypeOf<[string]>()
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

TIP

You can also use [`.toBeCallableWith`](https://vitest.dev/api/expect-typeof#tobecallablewith) matcher as a more expressive assertion.

parameter [​](https://vitest.dev/api/expect-typeof#parameter)
-------------------------------------------------------------

*   **Type:** `(nth: number) => ExpectTypeOf`

You can extract a certain function argument with `.parameter(number)` call to perform other assertions on it.

ts

```
import { expectTypeOf } from 'vitest'

function foo(a: number, b: string) {
  return [a, b]
}

expectTypeOf(foo).parameter(0).toBeNumber()
expectTypeOf(foo).parameter(1).toBeString()
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

constructorParameters [​](https://vitest.dev/api/expect-typeof#constructorparameters)
-------------------------------------------------------------------------------------

*   **Type:** `ExpectTypeOf<ConstructorParameters>`

You can extract constructor parameters as an array of values and perform assertions on them with this method.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(Date).constructorParameters.toEqualTypeOf<[] | [string | number | Date]>()
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

TIP

You can also use [`.toBeConstructibleWith`](https://vitest.dev/api/expect-typeof#tobeconstructiblewith) matcher as a more expressive assertion.

instance [​](https://vitest.dev/api/expect-typeof#instance)
-----------------------------------------------------------

*   **Type:** `ExpectTypeOf<ConstructableInstance>`

This property gives access to matchers that can be performed on an instance of the provided class.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(Date).instance.toHaveProperty('toISOString')
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

items [​](https://vitest.dev/api/expect-typeof#items)
-----------------------------------------------------

*   **Type:** `ExpectTypeOf<T>`

You can get array item type with `.items` to perform further assertions.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf([1, 2, 3]).items.toEqualTypeOf<number>()
expectTypeOf([1, 2, 3]).items.not.toEqualTypeOf<string>()
```

resolves [​](https://vitest.dev/api/expect-typeof#resolves)
-----------------------------------------------------------

*   **Type:** `ExpectTypeOf<ResolvedPromise>`

This matcher extracts resolved value of a `Promise`, so you can perform other assertions on it.

ts

```
import { expectTypeOf } from 'vitest'

async function asyncFunc() {
  return 123
}

expectTypeOf(asyncFunc).returns.resolves.toBeNumber()
expectTypeOf(Promise.resolve('string')).resolves.toBeString()
```

WARNING

If used on a non-promise type, it will return `never`, so you won't be able to chain it with other matchers.

guards [​](https://vitest.dev/api/expect-typeof#guards)
-------------------------------------------------------

*   **Type:** `ExpectTypeOf<Guard>`

This matcher extracts guard value (e.g., `v is number`), so you can perform assertions on it.

ts

```
import { expectTypeOf } from 'vitest'

function isString(v: any): v is string {
  return typeof v === 'string'
}
expectTypeOf(isString).guards.toBeString()
```

WARNING

Returns `never`, if the value is not a guard function, so you won't be able to chain it with other matchers.

asserts [​](https://vitest.dev/api/expect-typeof#asserts)
---------------------------------------------------------

*   **Type:** `ExpectTypeOf<Assert>`

This matcher extracts assert value (e.g., `assert v is number`), so you can perform assertions on it.

ts

```
import { expectTypeOf } from 'vitest'

function assertNumber(v: any): asserts v is number {
  if (typeof v !== 'number') {
    throw new TypeError('Nope !')
  }
}

expectTypeOf(assertNumber).asserts.toBeNumber()
```

WARNING

Returns `never`, if the value is not an assert function, so you won't be able to chain it with other matchers.

toBeAny [​](https://vitest.dev/api/expect-typeof#tobeany)
---------------------------------------------------------

*   **Type:** `() => void`

With this matcher you can check, if provided type is `any` type. If the type is too specific, the test will fail.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf<any>().toBeAny()
expectTypeOf({} as any).toBeAny()
expectTypeOf('string').not.toBeAny()
```

toBeUnknown [​](https://vitest.dev/api/expect-typeof#tobeunknown)
-----------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is `unknown` type.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf().toBeUnknown()
expectTypeOf({} as unknown).toBeUnknown()
expectTypeOf('string').not.toBeUnknown()
```

toBeNever [​](https://vitest.dev/api/expect-typeof#tobenever)
-------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is a `never` type.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf<never>().toBeNever()
expectTypeOf((): never => {}).returns.toBeNever()
```

toBeFunction [​](https://vitest.dev/api/expect-typeof#tobefunction)
-------------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is a `function`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(42).not.toBeFunction()
expectTypeOf((): never => {}).toBeFunction()
```

toBeObject [​](https://vitest.dev/api/expect-typeof#tobeobject)
---------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is an `object`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(42).not.toBeObject()
expectTypeOf({}).toBeObject()
```

toBeArray [​](https://vitest.dev/api/expect-typeof#tobearray)
-------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is `Array<T>`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(42).not.toBeArray()
expectTypeOf([]).toBeArray()
expectTypeOf([1, 2]).toBeArray()
expectTypeOf([{}, 42]).toBeArray()
```

toBeString [​](https://vitest.dev/api/expect-typeof#tobestring)
---------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is a `string`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(42).not.toBeString()
expectTypeOf('').toBeString()
expectTypeOf('a').toBeString()
```

toBeBoolean [​](https://vitest.dev/api/expect-typeof#tobeboolean)
-----------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is `boolean`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(42).not.toBeBoolean()
expectTypeOf(true).toBeBoolean()
expectTypeOf<boolean>().toBeBoolean()
```

toBeVoid [​](https://vitest.dev/api/expect-typeof#tobevoid)
-----------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is `void`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(() => {}).returns.toBeVoid()
expectTypeOf<void>().toBeVoid()
```

toBeSymbol [​](https://vitest.dev/api/expect-typeof#tobesymbol)
---------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is a `symbol`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(Symbol(1)).toBeSymbol()
expectTypeOf<symbol>().toBeSymbol()
```

toBeNull [​](https://vitest.dev/api/expect-typeof#tobenull)
-----------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is `null`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(null).toBeNull()
expectTypeOf<null>().toBeNull()
expectTypeOf(undefined).not.toBeNull()
```

toBeUndefined [​](https://vitest.dev/api/expect-typeof#tobeundefined)
---------------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if provided type is `undefined`.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(undefined).toBeUndefined()
expectTypeOf<undefined>().toBeUndefined()
expectTypeOf(null).not.toBeUndefined()
```

toBeNullable [​](https://vitest.dev/api/expect-typeof#tobenullable)
-------------------------------------------------------------------

*   **Type:** `() => void`

This matcher checks, if you can use `null` or `undefined` with provided type.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf<undefined | 1>().toBeNullable()
expectTypeOf<null | 1>().toBeNullable()
expectTypeOf<undefined | null | 1>().toBeNullable()
```

toBeCallableWith [​](https://vitest.dev/api/expect-typeof#tobecallablewith)
---------------------------------------------------------------------------

*   **Type:** `() => void`

This matcher ensures you can call provided function with a set of parameters.

ts

```
import { expectTypeOf } from 'vitest'

type NoParam = () => void
type HasParam = (s: string) => void

expectTypeOf<NoParam>().toBeCallableWith()
expectTypeOf<HasParam>().toBeCallableWith('some string')
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

toBeConstructibleWith [​](https://vitest.dev/api/expect-typeof#tobeconstructiblewith)
-------------------------------------------------------------------------------------

*   **Type:** `() => void`

This matcher ensures you can create a new instance with a set of constructor parameters.

ts

```
import { expectTypeOf } from 'vitest'

expectTypeOf(Date).toBeConstructibleWith(new Date())
expectTypeOf(Date).toBeConstructibleWith('01-01-2000')
```

WARNING

If used on a non-function type, it will return `never`, so you won't be able to chain it with other matchers.

toHaveProperty [​](https://vitest.dev/api/expect-typeof#tohaveproperty)
-----------------------------------------------------------------------

*   **Type:** `<K extends keyof T>(property: K) => ExpectTypeOf<T[K>`

This matcher checks if a property exists on the provided object. If it exists, it also returns the same set of matchers for the type of this property, so you can chain assertions one after another.

ts

```
import { expectTypeOf } from 'vitest'

const obj = { a: 1, b: '' }

expectTypeOf(obj).toHaveProperty('a')
expectTypeOf(obj).not.toHaveProperty('c')

expectTypeOf(obj).toHaveProperty('a').toBeNumber()
expectTypeOf(obj).toHaveProperty('b').toBeString()
expectTypeOf(obj).toHaveProperty('a').not.toBeString()
```
