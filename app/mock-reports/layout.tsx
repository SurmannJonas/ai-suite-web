export default function MdxLayout({ children }: { children: React.ReactNode }) {
  // Create any shared layout or styles here
  return <div className="bg-white   flex w-full" >
    <section className="prose p-8 h-full overflow-y-auto w-full  space-y-4">
      {children}
    </section>
  </div>
}
