import UrlForm from "@/components/url-form"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Presentation Generator using Alai.ai</h1>
          <p className="mt-2 text-muted-foreground">Enter a URL to submit to our API</p>
        </div>
        <UrlForm />
      </div>
    </main>
  )
}

