import { GetServerSideProps } from 'next';

// Reuse the subscription page with mode=cancel
export { default } from '../subscription';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { location_id } = ctx.query;

  if (!location_id) return { notFound: true };

  return {
    props: {
      locationId: location_id as string,
      mode: 'cancel',
    },
  };
};
