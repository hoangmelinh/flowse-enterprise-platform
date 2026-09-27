import TopNav from "./component/TopNav";
import HeroSection from "./component/HeroSection";
import HowItWorks from "./component/HowItWorks";
import FeaturesSection from "./component/FeaturesSection";
import CTABanner from "./component/CTABanner";
import Footer from "./component/Footer";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#f9f9ff] text-[var(--color-on-surface)]">
            <TopNav />
            <main>
                <HeroSection />
                <HowItWorks />
                <FeaturesSection />
                <CTABanner />
            </main>
            <Footer />
        </div>
    );
}
