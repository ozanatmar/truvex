import Navbar from './Navbar';
import Footer from './Footer';

interface Props {
  children: React.ReactNode;
}

export default function BlogLayout({ children }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: "'Lora', Georgia, serif", display: 'flex', flexDirection: 'column' }}>
      <Navbar activePage="blog" />
      {children}
      <Footer />
    </div>
  );
}
