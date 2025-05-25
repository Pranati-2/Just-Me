import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.username || '');
  const [name, setName] = useState(user?.displayName || '');

  // Convert prices to INR
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: '₹150',
      priceValue: 150,
      description: 'Access to all features with monthly billing',
      features: [
        'Access to all platforms',
        'Unlimited notes and journal entries',
        'Basic support',
        'Cancel anytime'
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: '₹1,500',
      priceValue: 1500,
      description: 'Save ₹300 with annual billing',
      features: [
        'All features of Monthly Plan',
        'Priority support',
        'Advanced features',
        'Two months free'
      ]
    }
  ];

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeRazorpayCheckout = async () => {
    // Basic validation
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!email.trim() || !email.includes('@')) {
      toast({
        title: 'Valid email required',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!phone.trim() || phone.length < 10) {
      toast({
        title: 'Valid phone required',
        description: 'Please enter a valid phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create an order on the server
      const selectedPlanData = plans.find(plan => plan.id === selectedPlan)!;
      const response = await apiRequest('POST', '/api/create-order', {
        amount: selectedPlanData.priceValue,
        receipt: `${user?.id || 'guest'}_${Date.now()}`,
        notes: {
          plan: selectedPlan,
          userId: user?.id?.toString() || 'guest'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      const orderData = await response.json();
      
      // Initialize Razorpay checkout
      if (window.Razorpay) {
        const razorpayOptions = {
          key: orderData.key_id, // From response
          amount: orderData.amount * 100, // In paise
          currency: orderData.currency,
          name: "Social Media Hub",
          description: `${selectedPlanData.name} Subscription`,
          order_id: orderData.orderId,
          prefill: {
            name: name,
            email: email,
            contact: phone
          },
          theme: {
            color: "#0a4da2", // Professional blue matching our theme
          },
          handler: function (response: any) {
            handlePaymentSuccess(response);
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              toast({
                title: 'Payment cancelled',
                description: 'You have cancelled the payment process.',
                variant: 'destructive',
              });
            }
          }
        };
        
        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.open();
      } else {
        throw new Error('Razorpay SDK failed to load');
      }
    } catch (error) {
      console.error('Error initializing payment:', error);
      toast({
        title: 'Payment initialization failed',
        description: 'Unable to initialize payment. Please try again later.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Verify the payment on the server
      const verificationResponse = await apiRequest('POST', '/api/verify-payment', {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature
      });
      
      if (!verificationResponse.ok) {
        throw new Error('Payment verification failed');
      }
      
      toast({
        title: 'Payment successful!',
        description: `You've been subscribed to the ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} plan.`,
      });
      
      setIsProcessing(false);
      setLocation('/');
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Payment verification failed',
        description: 'We received your payment, but verification failed. Please contact support.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove any non-digit characters
    return value.replace(/\D/g, '').substring(0, 10);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan)!;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Payment form */}
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>
                    Enter your details to complete your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.smith@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={handlePhoneChange}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        <span className="text-gray-500 hidden">+91</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 text-sm text-gray-500">
                    <p className="flex items-center mb-2">
                      <i className="ri-shield-check-line text-green-500 mr-2"></i>
                      Your payment will be processed securely by Razorpay
                    </p>
                    <p className="flex items-center">
                      <i className="ri-lock-line text-green-500 mr-2"></i>
                      We don't store your payment details on our servers
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={initializeRazorpayCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin mr-2">
                          <i className="ri-loader-2-line"></i>
                        </span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="ri-secure-payment-line mr-2"></i>
                        Proceed to Payment
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Order summary */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                  <CardDescription>
                    Review your subscription details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Plan selection */}
                  <div className="space-y-2">
                    <Label>Select Plan</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {plans.map(plan => (
                        <div
                          key={plan.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedPlan === plan.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{plan.name}</span>
                            {selectedPlan === plan.id && (
                              <i className="ri-check-line text-primary"></i>
                            )}
                          </div>
                          <div className="text-lg font-bold">{plan.price}</div>
                          <div className="text-xs text-gray-500">{plan.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Plan features */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-medium mb-2">Included Features:</h3>
                    <ul className="space-y-1">
                      {selectedPlanData.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <i className="ri-check-line text-green-500 mt-0.5 mr-2"></i>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Order total */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>{selectedPlanData.price}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>Tax (18% GST)</span>
                      <span>Included</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg mt-2">
                      <span>Total</span>
                      <span>{selectedPlanData.price}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-gray-500">
                  Your subscription will auto-renew at the end of the billing period. 
                  You can cancel anytime from your profile settings.
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
