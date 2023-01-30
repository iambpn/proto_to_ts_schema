import { z } from "zod";

const email = z.string().email();

const test = z.object({
  email: email,
});

const test2 = z.object({
  t: test,
});

interface TestService {
  testfn(data: z.infer<typeof test>): any;
}
