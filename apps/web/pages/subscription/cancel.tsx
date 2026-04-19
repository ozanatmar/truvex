import { GetServerSideProps } from 'next';

// Reuse the subscription page with mode=cancel
export { default } from '../subscription';

const RETURN_TO_PATTERN = /^(https?:\/\/|truvex:\/\/|exp(\+[\w-]+)?:\/\/)/i;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { location_id } = ctx.query;

  if (!location_id) return { notFound: true };

  const rawReturnTo = typeof ctx.query.return_to === 'string' ? ctx.query.return_to : '';
  const returnTo = RETURN_TO_PATTERN.test(rawReturnTo) ? rawReturnTo : 'truvex://subscription-updated';
  const prefillPhone = typeof ctx.query.phone === 'string' ? ctx.query.phone : '';

  return {
    props: {
      locationId: location_id as string,
      mode: 'cancel',
      returnTo,
      prefillPhone,
    },
  };
};
