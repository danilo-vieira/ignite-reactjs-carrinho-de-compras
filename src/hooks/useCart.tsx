import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId);
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      if (findProduct && findProduct.amount < productStock.amount) {
        const updatedCart = cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount: findProduct.amount + 1
            };
          } else {
            return product;
          }
        });

        setCart(updatedCart);
        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCart)
        )
      } else if (!findProduct && productStock.amount) {
        const { data: productData } = await api.get<Product>(`products/${productId}`);

        const updatedCart = [...cart, {
          ...productData,
          amount: 1
        }]

        setCart(updatedCart);

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCart)
        )
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId);

      if (!findProduct) {
        throw new Error();
      }

      const updatedCart = cart.filter(product => product.id !== productId);

      setCart(updatedCart);
      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      )
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }

    try {
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount
          }
        } else {
          return product;
        }
      });

      setCart(updatedCart);
      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      )
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
