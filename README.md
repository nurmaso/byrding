# react-hook-store

The react hook store is a project inspired by pinia, a vue store plugin. It trys to mimic the native js assignment handling for store components inside of react.

## How to use

1. `npm i react-hook-store`
1. Create a store structure (for larger projects I prefer mind maps)
1. Create your first store

```tsx
// Define Store
import { defineStore } from 'react-hook-store';

const useMyStore = defineStore('MyStore', {
  state: {
    myStoreValue: 0,
    userName: '',
    // you can use getters in the state definition right away, if you prefer to keep values together
    // or use getters definition
    get welcome() {
        return `Welcome ${this.userName}`
    }
  },
  // Don't use arrow functions definition in actions as they will loose context
  actions: {
    inc() {
      this.myStoreValye += 1;
    },
    multiplyBy(multiplier: number) {
      this.myStoreValye *= multiplier;
    },
    setUserName(name: string) {
        this.userName = name
    }
  },
  // you can define getters here or in the state itself - however you prefer
  // Don't use arrow functions as they will loose context
  getters: {
    hello(state) {
        return `Hello ${state.userName}`
    },
    myStoreDouble(state): number {
      return state.myStoreValue * 2;
    },
    getDoubledValueMultiplied() =>
      (multiplier: number): number => {
        return this.myStoreDouble * multiplier;
      },
  },
  init() {
    console.log(
      `This get called once, as soon as this store gets initialised for the first time`
    );
  },
});


// React Component
const MyComponent = () => {
    const { store } = useMyStore()

    const updateName = (e: ChangeEvent) => {
        store.setUserName(e.target.value)
    }

    return (<>
        <h1>{store.welcome} or do you prefer {store.hello}</h1>
        <input value={store.userName} onUpdate={updateName} />
        <div>
            <span>What's your age? </span> { store.myStoreValue }
            // you can use store function to change store value
            <button onClick={ store.inc }>inc</button>
            // or just assign a new value, update will be handled automatically
            <button onClick={ () => store.myStoreValue-- }>dec</button>
        </div>
        <span>Let's double your age: {store.myStoreDouble}</span>
    <>)
}
```

## Project Mantra

1. Write less code
1. Reduce it if possible
1. Don't try to over-engineer

## Why don't use Context?

React Context invokes all children on a change of the context. This is not optimal, if you have a deep nested page with a lot of different scopes. These scopes could be split in different stores. Yes, we could scope the context as well, but this would limit us in the DOM structure.

## Why don't use other stores?

Tbh, there is no good reason! I think it's about your personal taste or what's best for the project/company you work for. This is **not** a well maintained project yet. So don't expect anything... Or just jump in and help yourself.

## What is a valid use case for a store or for this store?

If you have full control over the store context and you don't want to control other stores based on a dispatch call (tbh I'm not a big Redux fan :P )
If you don't want to pass state values as properties.
If you like pinia, but you want/like/...have to use react.

## Thoughts

This store tries to make life easier and focus on the actual functionality and reduce a amount of boilerplate you have to write. AND probably most important reason: I just wanted to play around with react and typescript.

If you think it's not the right thing to use, there is a lot our there, go and catch 'em all :)

If you have any idea to improve or want to participate, please reach out to me or just fork it!

## Todos

- [x] Proper typescript support for getters
- [x] store class implementation
  - [ ] use store class as return value to reduce typing
  - [ ] avoid already declared names
- [ ] define dev tools
- [x] native assign handling like store.value = 'new value' -> update()

### store class implementation

#### use store class as return value to reduce typing

e.g. defineStore return object

```
this.state.value -> this.value
this.getters.getter -> this.getter
this.actions.method -> this.method
```

### native assign handling

~~- Add native assign handling to state values. state.value = 'newValue'.~~

~~- This could be integrated with a setter and getter handling (maybe in the root store?)~~
