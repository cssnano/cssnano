import React from 'react';

export const AppContext = React.createContext({});

export const StoreProvider = AppContext.Provider;
export const StoreConsumer = AppContext.Consumer;
