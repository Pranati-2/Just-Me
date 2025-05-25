import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function CheckoutButton() {
  const [location, navigate] = useLocation();

  const handleNavigateToCheckout = () => {
    navigate('/checkout');
  };

  return (
    <Button 
      className="flex items-center bg-primary hover:bg-primary/90 text-white"
      onClick={handleNavigateToCheckout}
    >
      <i className="ri-shopping-cart-line mr-2"></i>
      Checkout
    </Button>
  );
}
