import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import PaymentForm from './PaymentForm';

const stripePromise = loadStripe("pk_test_51Qp5LOPs8mVJ1TARXPGnFhtXqSGxyInN2qfw2Suc8Uc9UT4iDcYC90XHcCWjViiqsIidXKA1sSoHEE68SdBXvR8000d6SXeuJa");

function PaymentDialog({ open, onClose, onSubmit, loading, title, amount }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Elements stripe={stripePromise}>
            <PaymentForm
              onSubmit={onSubmit}
              loading={loading}
              amount={amount}
            />
          </Elements>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentDialog;
