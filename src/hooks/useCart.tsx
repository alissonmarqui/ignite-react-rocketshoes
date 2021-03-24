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
      const productIndex = cart.findIndex( p => p.id === productId);
      
      // If exists update amount
      if (productIndex >= 0) {             
        await updateProductAmount({
          productId: cart[productIndex].id, 
          amount: cart[productIndex].amount + 1
        })        
        return;
      }

      // Add new product

      const productResponse = await api.get(`products/${productId}`)
      const product: Product = productResponse.data;

      const stockResponse = await api.get(`stock/${productId}`)      
      const stock: Stock = stockResponse.data;
      
      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart, {...product, amount: 1}]

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(p => p.id === productId);

      if (productIndex < 0) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter(p => p.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart)
    } catch {      
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const productIndex = cart.findIndex( p => p.id === productId);

      const product = cart[productIndex];      

      const stockResponse = await api.get(`stock/${productId}`)      
      const stock: Stock = stockResponse.data;

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(p => {
        return p.id === product.id ? {...p, amount } : p;
      })

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart)

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
